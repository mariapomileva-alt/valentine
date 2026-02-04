import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Resend } from "resend";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4242;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:5500/fast-valentine/index.html";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "";
const PRICE_EUR = 699;
const FREE_LIMIT = 25;
const RATE_LIMIT_PER_DAY = Number(process.env.RATE_LIMIT_PER_DAY || 10);

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const dataFile = path.join(__dirname, "campaigns.json");
const messagesFile = path.join(__dirname, "messages.json");
const rateLimitCache = new Map();

const readCampaigns = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}));
  }
  const raw = fs.readFileSync(dataFile, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
};

const readMessages = () => {
  if (!fs.existsSync(messagesFile)) {
    fs.writeFileSync(messagesFile, JSON.stringify({}));
  }
  const raw = fs.readFileSync(messagesFile, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
};

const writeCampaigns = (campaigns) => {
  fs.writeFileSync(dataFile, JSON.stringify(campaigns, null, 2));
};

const writeMessages = (messages) => {
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
};

const getOrCreateCampaign = (campaignId) => {
  const campaigns = readCampaigns();
  if (!campaigns[campaignId]) {
    campaigns[campaignId] = {
      id: campaignId,
      admin_token: crypto.randomBytes(24).toString("hex"),
      sent_count: 0,
      free_limit: FREE_LIMIT,
      status: "free",
    };
    writeCampaigns(campaigns);
  }
  return campaigns[campaignId];
};

const updateCampaign = (campaignId, updater) => {
  const campaigns = readCampaigns();
  const current = campaigns[campaignId] || {
    id: campaignId,
    admin_token: crypto.randomBytes(24).toString("hex"),
    sent_count: 0,
    free_limit: FREE_LIMIT,
    status: "free",
  };
  const updated = updater(current);
  campaigns[campaignId] = updated;
  writeCampaigns(campaigns);
  return updated;
};

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
  let event = null;
  if (STRIPE_WEBHOOK_SECRET) {
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
  } else {
    try {
      event = JSON.parse(req.body.toString());
    } catch (error) {
      res.status(400).send("Webhook Error: Invalid payload");
      return;
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const campaignId = session?.metadata?.campaign_id;
    if (campaignId) {
      updateCampaign(campaignId, (current) => ({
        ...current,
        status: "unlocked",
      }));
    }
  }
  res.json({ received: true });
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

app.post("/api/create-campaign", (_req, res) => {
  const campaignId = crypto.randomBytes(8).toString("hex");
  const adminToken = crypto.randomBytes(24).toString("hex");
  const campaigns = readCampaigns();
  campaigns[campaignId] = {
    id: campaignId,
    admin_token: adminToken,
    sent_count: 0,
    free_limit: FREE_LIMIT,
    status: "free",
  };
  writeCampaigns(campaigns);
  res.json({
    campaign_id: campaignId,
    admin_token: adminToken,
    public_url: `${PUBLIC_BASE_URL}?c=${campaignId}`,
    admin_url: `${PUBLIC_BASE_URL}?c=${campaignId}&admin=${adminToken}`,
  });
});

app.get("/api/campaign", (req, res) => {
  const campaignId = req.query.c;
  if (!campaignId) {
    res.status(400).json({ error: "campaign_id_required" });
    return;
  }
  const campaign = getOrCreateCampaign(campaignId);
  const adminToken = req.query.admin;
  const isAdmin = adminToken && adminToken === campaign.admin_token;
  res.json({
    is_admin: Boolean(isAdmin),
    campaign: {
      id: campaign.id,
      sent_count: campaign.sent_count,
      free_limit: campaign.free_limit,
      status: campaign.status,
    },
  });
});

app.post("/api/send", async (req, res) => {
  const campaignId = req.body?.campaign_id;
  const message = req.body?.message;
  if (!campaignId) {
    res.status(400).json({ error: "campaign_id_required" });
    return;
  }
  const campaign = getOrCreateCampaign(campaignId);
  if (campaign.status === "locked") {
    res.status(403).json({ error: "campaign_locked" });
    return;
  }
  if (!message?.recipient_email || !message?.recipient_link) {
    res.status(400).json({ error: "message_invalid" });
    return;
  }
  if (!resend || !RESEND_FROM) {
    res.status(500).json({ error: "email_not_configured" });
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `${campaignId}:${ip}:${today}`;
  const currentCount = rateLimitCache.get(rateKey) || 0;
  if (currentCount >= RATE_LIMIT_PER_DAY) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  rateLimitCache.set(rateKey, currentCount + 1);

  const isSuccess = message?.status === "sent";
  if (isSuccess) {
    const subject = "You received a Valentine 💜";
    const text = `Someone sent you a Valentine. Open it here: ${message.recipient_link}`;
    const sendResult = await resend.emails.send({
      from: RESEND_FROM,
      to: message.recipient_email,
      subject,
      text,
    });
    if (!sendResult?.data?.id) {
      res.status(500).json({ error: "email_send_failed" });
      return;
    }
    if (message.copy_requested && message.sender_email) {
      await resend.emails.send({
        from: RESEND_FROM,
        to: message.sender_email,
        subject: "Your Valentine was sent 💜",
        text: `We sent your Valentine. Here is the link you shared: ${message.recipient_link}`,
      });
    }

    const updated = updateCampaign(campaignId, (current) => {
      const sentCount = current.sent_count + 1;
      const nextStatus = current.status === "unlocked"
        ? "unlocked"
        : sentCount >= current.free_limit
          ? "locked"
          : "free";
      return {
        ...current,
        sent_count: sentCount,
        status: nextStatus,
      };
    });

    const messages = readMessages();
    const entry = {
      created_at: message?.created_at || new Date().toISOString(),
      recipient_email: message?.recipient_email || "",
      sender_name: message?.sender_name || "",
      anonymous: Boolean(message?.anonymous),
      has_image: Boolean(message?.has_image),
      status: message?.status || "sent",
    };
    messages[campaignId] = messages[campaignId] || [];
    messages[campaignId].push(entry);
    writeMessages(messages);

    res.json({ is_admin: false, campaign: {
      id: updated.id,
      sent_count: updated.sent_count,
      free_limit: updated.free_limit,
      status: updated.status,
    } });
    return;
  }

  res.json({ is_admin: false, campaign: {
    id: campaign.id,
    sent_count: campaign.sent_count,
    free_limit: campaign.free_limit,
    status: campaign.status,
  } });
});

app.get("/api/export.csv", (req, res) => {
  const campaignId = req.query.c;
  const adminToken = req.query.admin;
  if (!campaignId || !adminToken) {
    res.status(403).send("forbidden");
    return;
  }
  const campaign = getOrCreateCampaign(campaignId);
  if (campaign.admin_token !== adminToken) {
    res.status(403).send("forbidden");
    return;
  }
  const messages = readMessages();
  const rows = messages[campaignId] || [];
  const allowFull = campaign.status === "unlocked";
  const headers = [
    "timestamp",
    "anonymous",
    "sender_name",
    "recipient_domain",
    "recipient_email_masked",
    "has_image",
    "status",
  ];
  const maskEmail = (email) => {
    const [user, domain] = String(email || "").split("@");
    if (!domain) return email || "";
    return `${user.slice(0, 1)}***@${domain}`;
  };
  const escapeValue = (value) => `"${String(value || "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escapeValue).join(",")];
  rows.forEach((row) => {
    const domain = String(row.recipient_email || "").split("@")[1] || "";
    const email = allowFull ? row.recipient_email : maskEmail(row.recipient_email);
    lines.push([
      row.created_at,
      row.anonymous ? "true" : "false",
      row.sender_name || "",
      domain,
      email,
      row.has_image ? "true" : "false",
      row.status || "sent",
    ].map(escapeValue).join(","));
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(lines.join("\n"));
});

app.post("/api/create-checkout-session", async (req, res) => {
  const campaignId = req.body?.campaign_id;
  const adminToken = req.body?.admin_token;
  if (!campaignId || !adminToken) {
    res.status(400).json({ error: "campaign_id_required" });
    return;
  }
  const campaign = getOrCreateCampaign(campaignId);
  if (campaign.admin_token !== adminToken) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "stripe_not_configured" });
    return;
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Fast Valentine Campaign Unlock",
          },
          unit_amount: PRICE_EUR,
        },
        quantity: 1,
      },
    ],
    success_url: `${PUBLIC_BASE_URL}?unlock=success&c=${campaignId}`,
    cancel_url: `${PUBLIC_BASE_URL}?c=${campaignId}&admin=${adminToken}`,
    metadata: {
      campaign_id: campaignId,
    },
  });
  res.json({ checkout_url: session.url });
});

app.listen(PORT, () => {
  console.log(`Fast Valentine server running on port ${PORT}`);
});
