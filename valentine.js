const composeView = document.getElementById("composeView");
const thankYouView = document.getElementById("thankYouView");
const adminView = document.getElementById("adminView");
const recipientView = document.getElementById("recipientView");

const brandHome = document.getElementById("brandHome");
const valentineForm = document.getElementById("valentineForm");
const valentineMessage = document.getElementById("valentineMessage");
const messageCounter = document.getElementById("messageCounter");
const valentineImage = document.getElementById("valentineImage");
const recipientEmail = document.getElementById("recipientEmail");
const anonymousToggle = document.getElementById("anonymousToggle");
const signatureFields = document.getElementById("signatureFields");
const senderName = document.getElementById("senderName");
const copyToggle = document.getElementById("copyToggle");
const copyFields = document.getElementById("copyFields");
const senderEmail = document.getElementById("senderEmail");
const sendBtn = document.getElementById("sendBtn");
const formMessage = document.getElementById("formMessage");
const domainRule = document.getElementById("domainRule");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewImg = document.getElementById("imagePreviewImg");
const imagePreviewName = document.getElementById("imagePreviewName");
const removeImageBtn = document.getElementById("removeImageBtn");
const sendAnotherBtn = document.getElementById("sendAnotherBtn");
const copyShareBtn = document.getElementById("copyShareBtn");
const copyStatus = document.getElementById("copyStatus");
const templateButtons = Array.from(document.querySelectorAll("[data-template]"));

const recipientTitle = document.getElementById("recipientTitle");
const recipientMessage = document.getElementById("recipientMessage");
const recipientImageWrap = document.getElementById("recipientImageWrap");
const recipientImage = document.getElementById("recipientImage");
const recipientSignature = document.getElementById("recipientSignature");
const recipientCta = document.getElementById("recipientCta");

const adminLink = document.getElementById("adminLink");
const adminBackBtn = document.getElementById("adminBackBtn");
const shareLink = document.getElementById("shareLink");
const adminShareLink = document.getElementById("adminShareLink");
const shortLink = document.getElementById("shortLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyAdminBtn = document.getElementById("copyAdminBtn");
const copyShortBtn = document.getElementById("copyShortBtn");
const qrCodeImage = document.getElementById("qrCodeImage");
const qrCodeFallback = document.getElementById("qrCodeFallback");
const downloadQrBtn = document.getElementById("downloadQrBtn");
const totalSent = document.getElementById("totalSent");
const sentToday = document.getElementById("sentToday");
const anonymousSigned = document.getElementById("anonymousSigned");
const deliveryStatus = document.getElementById("deliveryStatus");
const recentList = document.getElementById("recentList");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const seedDataBtn = document.getElementById("seedDataBtn");
const clearDataBtn = document.getElementById("clearDataBtn");
const moderationCard = document.getElementById("moderationCard");
const moderationList = document.getElementById("moderationList");

const campaignStart = document.getElementById("campaignStart");
const campaignEnd = document.getElementById("campaignEnd");
const rateLimit = document.getElementById("rateLimit");
const allowedDomains = document.getElementById("allowedDomains");
const blockLinks = document.getElementById("blockLinks");
const profanityFilter = document.getElementById("profanityFilter");
const moderationToggle = document.getElementById("moderationToggle");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const STORAGE_KEY = "fastValentineMessages";
const CAMPAIGN_KEY = "fastValentineCampaign";
const CAMPAIGN_ID_KEY = "fastValentineCampaignId";
const ADMIN_TOKEN_PREFIX = "fv_admin_";
const EVENTS_KEY = "fastValentineEvents";
const SETTINGS_KEY = "fastValentineSettings";
const ADMIN_KEY = "fastValentineAdminKey";
const ADMIN_PARAM = "admin";
const ADMIN_KEY_PARAM = "key";
const RECIPIENT_PARAM = "v";
const UNLOCK_PARAM = "unlock";
const CAMPAIGN_PARAM = "c";
const MAX_MESSAGE = 800;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const FREE_LIMIT = 25;
const UNLOCK_PRICE = 6.99;
const STRIPE_CHECKOUT_URL = "";

const TEMPLATE_LIBRARY = {
    Sweet: "You make my world brighter every day.",
    Funny: "You stole my heart and I am not even mad.",
    Grateful: "Thank you for being the best part of my day.",
    Friendly: "Just a little note to say you are awesome.",
    Bold: "I like you. A lot. Happy Valentine’s Day!",
};

const PROFANITY_WORDS = [
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "cunt",
    "dick",
    "bastard",
    "whore",
];

let imagePayload = null;
let volumeChart = null;
let anonymousChart = null;
let templateChart = null;
let isAdminSession = false;
let unlockViewed = false;
let campaignState = null;
let adminBannerMessage = "";
let adminToken = null;

const showView = (view) => {
    [composeView, thankYouView, adminView, recipientView].forEach((section) => {
        section.classList.add("hidden");
    });
    view.classList.remove("hidden");
};

const generateToken = (length = 12) => Math.random().toString(36).slice(2, 2 + length);

const getBaseUrl = () => {
    const { origin, pathname } = window.location;
    if (origin === "null") {
        const href = window.location.href.split("?")[0].split("#")[0];
        return href.replace(/\/index\.html$/, "");
    }
    const basePath = pathname.replace(/\/index\.html$/, "");
    return `${origin}${basePath}`.replace(/\/$/, "");
};

const getMessages = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        return [];
    }
};

const saveMessages = (messages) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
};

const addMessage = (message) => {
    const messages = getMessages();
    messages.unshift(message);
    saveMessages(messages);
    return messages;
};

const trackEvent = (name, payload = {}) => {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    let events = [];
    if (raw) {
        try {
            events = JSON.parse(raw);
        } catch (error) {
            events = [];
        }
    }
    events.unshift({
        name,
        payload,
        createdAt: new Date().toISOString(),
    });
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

const getCampaignId = () => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(CAMPAIGN_PARAM);
    if (fromUrl) {
        window.localStorage.setItem(CAMPAIGN_ID_KEY, fromUrl);
        return fromUrl;
    }
    return window.localStorage.getItem(CAMPAIGN_ID_KEY);
};

const getCampaign = () => {
    if (campaignState) {
        return campaignState;
    }
    const raw = window.localStorage.getItem(CAMPAIGN_KEY);
    const campaignId = getCampaignId();
    if (!raw) {
        const campaign = {
            id: campaignId,
            sent_count: 0,
            free_limit: FREE_LIMIT,
            status: "free",
        };
        window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
        trackEvent("campaign_created", { campaignId: campaign.id });
        campaignState = campaign;
        return campaign;
    }
    try {
        const parsed = JSON.parse(raw);
        campaignState = { ...parsed, id: campaignId };
        return campaignState;
    } catch (error) {
        const fallback = {
            id: campaignId,
            sent_count: 0,
            free_limit: FREE_LIMIT,
            status: "free",
        };
        window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(fallback));
        trackEvent("campaign_created", { campaignId: fallback.id });
        campaignState = fallback;
        return fallback;
    }
};

const saveCampaign = (campaign) => {
    campaignState = campaign;
    window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
};

const getStoredAdminToken = (campaignId) => window.localStorage.getItem(`${ADMIN_TOKEN_PREFIX}${campaignId}`);

const fetchCampaignState = async () => {
    const campaignId = getCampaignId();
    if (!campaignId) {
        return getCampaign();
    }
    const token = adminToken || getStoredAdminToken(campaignId);
    const url = new URL("/api/campaign", window.location.origin);
    url.searchParams.set("c", campaignId);
    if (token) {
        url.searchParams.set("admin", token);
    }
    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error("campaign_fetch_failed");
        }
        const data = await response.json();
        if (data?.is_admin && token) {
            adminToken = token;
            window.localStorage.setItem(`${ADMIN_TOKEN_PREFIX}${campaignId}`, token);
        }
        isAdminSession = Boolean(data?.is_admin);
        saveCampaign(data.campaign || data);
        return data.campaign || data;
    } catch (error) {
        return getCampaign();
    }
};

const refreshCampaignState = async () => {
    const previous = getCampaign();
    const updated = await fetchCampaignState();
    if (previous.status !== "unlocked" && updated.status === "unlocked") {
        trackEvent("campaign_unlocked", { campaignId: updated.id });
        if (isAdminSession) {
            adminBannerMessage = "Campaign unlocked 🎉";
        }
    }
    return updated;
};

const createCampaign = async () => {
    try {
        const response = await fetch("/api/create-campaign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            throw new Error("campaign_create_failed");
        }
        const data = await response.json();
        if (data?.campaign_id) {
            trackEvent("campaign_created", { campaignId: data.campaign_id });
        }
        return data;
    } catch (error) {
        return null;
    }
};

const recordCampaignSend = async (payload) => {
    const campaignId = getCampaignId();
    if (!campaignId) {
        return { campaign: getCampaign(), error: "campaign_missing" };
    }
    const previous = getCampaign();
    try {
        const response = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaign_id: campaignId, message: payload }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return { campaign: previous, error: data?.error || "campaign_send_failed" };
        }
        const data = await response.json();
        const nextCampaign = data.campaign || data;
        saveCampaign(nextCampaign);
        if (previous.status !== "locked" && nextCampaign.status === "locked") {
            trackEvent("campaign_reached_limit", { campaignId: nextCampaign.id });
        }
        return { campaign: nextCampaign, error: null };
    } catch (error) {
        return { campaign: previous, error: "campaign_send_failed" };
    }
};

const isCampaignUnlocked = (campaign) => campaign.status === "unlocked";

const lockCampaignIfNeeded = (campaign) => {
    if (campaign.status === "free" && campaign.sent_count >= campaign.free_limit) {
        campaign.status = "locked";
        saveCampaign(campaign);
        trackEvent("campaign_reached_limit", { campaignId: campaign.id });
    }
};

const defaultSettings = () => ({
    campaignStart: "",
    campaignEnd: "",
    rateLimit: 10,
    allowedDomains: "",
    blockLinks: true,
    profanityFilter: true,
    moderation: false,
});

const getSettings = () => {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
        return defaultSettings();
    }
    try {
        return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch (error) {
        return defaultSettings();
    }
};

const saveSettings = (settings) => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const formatDate = (isoString) => new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
});

const formatTime = (isoString) => new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
});

const maskEmail = (email) => {
    const [user, domain] = email.split("@");
    if (!domain) {
        return email;
    }
    const first = user.slice(0, 1);
    return `${first}***@${domain}`;
};

const sanitizeMessage = (message) => message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

const containsBlockedLinks = (message) => /https?:\/\/|www\./i.test(message);

const containsProfanity = (message) => {
    const regex = new RegExp(`\\b(${PROFANITY_WORDS.join("|")})\\b`, "i");
    return regex.test(message);
};

const getAllowedDomains = (settings) => settings.allowedDomains
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

const isAllowedDomain = (email, settings) => {
    const domains = getAllowedDomains(settings);
    if (!domains.length) {
        return true;
    }
    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? domains.includes(domain) : false;
};

const isSenderEmailAllowed = (email, settings) => {
    if (!email) {
        return true;
    }
    return isAllowedDomain(email, settings);
};

const getSenderKey = () => {
    if (copyToggle.checked && senderEmail.value.trim()) {
        return senderEmail.value.trim().toLowerCase();
    }
    return "browser";
};

const getRateLimitCount = (messages, senderKey) => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return messages.filter((msg) => msg.senderKey === senderKey && msg.createdAt.slice(0, 10) === todayKey).length;
};

const isCampaignActive = (settings) => {
    const now = new Date();
    const start = settings.campaignStart ? new Date(settings.campaignStart) : null;
    const end = settings.campaignEnd ? new Date(settings.campaignEnd) : null;
    if (start && now < start) {
        return false;
    }
    if (end && now > end) {
        return false;
    }
    return true;
};

const setAdminLinks = () => {
    const baseUrl = getBaseUrl();
    const campaignId = getCampaignId();
    if (!campaignId) {
        shareLink.value = "";
        adminShareLink.value = "";
        shortLink.value = "";
        adminLink.href = "#";
        return;
    }
    const publicLink = `${baseUrl}/?${CAMPAIGN_PARAM}=${campaignId}`;
    const adminTokenValue = adminToken || getStoredAdminToken(campaignId);
    const adminLinkValue = adminTokenValue
        ? `${baseUrl}/?${ADMIN_PARAM}=${adminTokenValue}&${CAMPAIGN_PARAM}=${campaignId}`
        : "";

    shareLink.value = publicLink;
    adminShareLink.value = adminLinkValue;
    shortLink.value = "";
    adminLink.href = adminLinkValue;

    const encoded = encodeURIComponent(publicLink);
    qrCodeImage.onload = () => {
        qrCodeImage.classList.remove("hidden");
        qrCodeFallback?.classList.add("hidden");
    };
    qrCodeImage.onerror = () => {
        qrCodeImage.classList.add("hidden");
        qrCodeFallback?.classList.remove("hidden");
    };
    qrCodeImage.src = `https://quickchart.io/qr?text=${encoded}&size=180`;
};

const updateAnonymousToggle = () => {
    if (anonymousToggle.checked) {
        signatureFields.classList.add("hidden");
        senderName.removeAttribute("required");
    } else {
        signatureFields.classList.remove("hidden");
        senderName.setAttribute("required", "required");
    }
};

const updateCopyToggle = () => {
    if (copyToggle.checked) {
        copyFields.classList.remove("hidden");
        senderEmail.setAttribute("required", "required");
    } else {
        copyFields.classList.add("hidden");
        senderEmail.removeAttribute("required");
    }
};

const updateCounter = () => {
    const length = valentineMessage.value.length;
    messageCounter.textContent = `${length} / ${MAX_MESSAGE}`;
};

const updateDomainRule = () => {
    const settings = getSettings();
    const domains = getAllowedDomains(settings);
    if (domains.length) {
        domainRule.textContent = `Allowed domains: ${domains.join(", ")}`;
        domainRule.classList.remove("hidden");
    } else {
        domainRule.classList.add("hidden");
    }
};

const ensureCampaignRequestBlock = () => {
    let block = document.getElementById("campaignRequestBlock");
    if (!block) {
        block = document.createElement("div");
        block.id = "campaignRequestBlock";
        block.className = "helper";
        const button = document.createElement("button");
        button.type = "button";
        button.id = "getCampaignBtn";
        button.className = "btn btn-secondary";
        button.textContent = "Get campaign link";
        block.appendChild(button);
        const helper = document.querySelector(".helper");
        helper?.parentElement?.insertBefore(block, helper);
    }
    return block;
};

const applyCampaignState = async () => {
    const campaignId = getCampaignId();
    if (!campaignId) {
        return;
    }
    const requestBlock = document.getElementById("campaignRequestBlock");
    if (requestBlock) {
        requestBlock.classList.remove("hidden");
    }
    const campaign = await refreshCampaignState();
    lockCampaignIfNeeded(campaign);
    const locked = campaign.status === "locked";
    const unlocked = isCampaignUnlocked(campaign);

    if (locked) {
        sendBtn.disabled = true;
        formMessage.textContent = "This Valentine campaign has reached its limit. Please contact the campaign organizer.";
    } else if (formMessage.textContent === "This Valentine campaign has reached its limit. Please contact the campaign organizer.") {
        formMessage.textContent = "";
        validateForm();
    }

    if (unlocked) {
        copyToggle.checked = true;
        copyToggle.disabled = true;
        copyFields.classList.remove("hidden");
        senderEmail.setAttribute("required", "required");
    } else {
        copyToggle.disabled = false;
        updateCopyToggle();
    }

    if (campaign.status !== "unlocked") {
        adminBannerMessage = "";
    }
    if (isAdminSession && campaign.status === "free" && campaign.sent_count >= 5 && campaign.sent_count < 15) {
        adminBannerMessage = "Nice start! Your campaign is active and growing.";
    }
    if (isAdminSession && campaign.status === "free" && campaign.sent_count >= 15 && campaign.sent_count < campaign.free_limit) {
        adminBannerMessage = "Great momentum! You are close to the free limit.";
    }
    if (isAdminSession && campaign.status === "locked") {
        adminBannerMessage = "You’ve reached the free limit 💜 Unlock this campaign to keep sending Valentines.";
        if (!unlockViewed) {
            trackEvent("unlock_modal_viewed", { campaignId: campaign.id });
            unlockViewed = true;
        }
    }

    if (isAdminSession) {
        if (campaign.status === "locked") {
            copyShortBtn.textContent = `Unlock campaign — €${UNLOCK_PRICE.toFixed(2)}`;
            copyShortBtn.dataset.mode = "unlock";
        } else {
            copyShortBtn.textContent = "Copy short";
            copyShortBtn.dataset.mode = "copy";
        }
    }
};

const resetForm = () => {
    valentineForm.reset();
    imagePayload = null;
    imagePreview.classList.add("hidden");
    imagePreviewImg.src = "";
    imagePreviewName.textContent = "";
    updateAnonymousToggle();
    updateCopyToggle();
    updateCounter();
    formMessage.textContent = "";
    sendBtn.disabled = true;
};

const buildRecipientLink = (id) => `${getBaseUrl()}/?${RECIPIENT_PARAM}=${id}&${CAMPAIGN_PARAM}=${getCampaignId()}`;

const buildCsv = (messages) => {
    const campaign = getCampaign();
    const headers = [
        "timestamp",
        "anonymous",
        "sender_name",
        "recipient_domain",
        "recipient_email_masked",
        "has_image",
        "status",
    ];
    const rows = messages.map((entry) => [
        entry.createdAt,
        entry.anonymous ? "true" : "false",
        entry.senderName || "",
        entry.recipientDomain || "",
        isCampaignUnlocked(campaign) ? entry.recipientEmail : maskEmail(entry.recipientEmail),
        entry.image ? "true" : "false",
        entry.status,
    ]);

    const escapeValue = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [headers.map(escapeValue).join(",")];
    rows.forEach((row) => {
        lines.push(row.map(escapeValue).join(","));
    });
    return lines.join("\n");
};

const downloadCsv = (messages) => {
    const csv = buildCsv(messages);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fast-valentine.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const getDailyCounts = (messages, days = 7) => {
    const today = new Date();
    const labels = [];
    const counts = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        labels.push(label);
        const dayKey = date.toISOString().slice(0, 10);
        const count = messages.filter((msg) => msg.createdAt.slice(0, 10) === dayKey && msg.status === "sent").length;
        counts.push(count);
    }
    return { labels, counts };
};

const renderCharts = (messages) => {
    const { labels, counts } = getDailyCounts(messages);
    const sentMessages = messages.filter((msg) => msg.status === "sent");
    const anonymousTotal = sentMessages.filter((msg) => msg.anonymous).length;
    const signedTotal = sentMessages.length - anonymousTotal;

    if (volumeChart) {
        volumeChart.destroy();
    }
    if (anonymousChart) {
        anonymousChart.destroy();
    }
    if (templateChart) {
        templateChart.destroy();
    }

    const volumeContext = document.getElementById("volumeChart");
    volumeChart = new Chart(volumeContext, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Sent",
                    data: counts,
                    borderColor: "#ff4d8d",
                    backgroundColor: "rgba(255, 77, 141, 0.2)",
                    tension: 0.3,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    });

    const anonymousContext = document.getElementById("anonymousChart");
    anonymousChart = new Chart(anonymousContext, {
        type: "doughnut",
        data: {
            labels: ["Anonymous", "Signed"],
            datasets: [
                {
                    data: [anonymousTotal, signedTotal],
                    backgroundColor: ["#ff4d8d", "#ffd6e7"],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" },
            },
        },
    });

    const templateCounts = Object.keys(TEMPLATE_LIBRARY).map((template) => ({
        label: template,
        count: sentMessages.filter((msg) => msg.template === template).length,
    }));
    const templateContext = document.getElementById("templateChart");
    templateChart = new Chart(templateContext, {
        type: "bar",
        data: {
            labels: templateCounts.map((item) => item.label),
            datasets: [
                {
                    label: "Uses",
                    data: templateCounts.map((item) => item.count),
                    backgroundColor: "rgba(11, 45, 91, 0.2)",
                    borderColor: "#0b2d5b",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    });
};

const renderRecentList = (messages) => {
    recentList.innerHTML = "";
    if (isAdminSession && adminBannerMessage) {
        const banner = document.createElement("div");
        banner.className = "recent-item";
        banner.innerHTML = `<div><strong>${adminBannerMessage}</strong></div>`;
        recentList.appendChild(banner);
    }
    if (!messages.length) {
        const empty = document.createElement("div");
        empty.className = "recent-item";
        empty.textContent = "No deliveries yet.";
        recentList.appendChild(empty);
        return;
    }
    messages.slice(0, 5).forEach((entry) => {
        const item = document.createElement("div");
        item.className = "recent-item";
        item.innerHTML = `
            <div>
                <strong>${maskEmail(entry.recipientEmail)}</strong>
                <div>${entry.anonymous ? "Anonymous" : entry.senderName}</div>
                <div>Status: ${entry.status}</div>
            </div>
            <div>${formatDate(entry.createdAt)} · ${formatTime(entry.createdAt)}</div>
        `;
        recentList.appendChild(item);
    });
};

const renderModerationQueue = (messages) => {
    const pending = messages.filter((msg) => msg.status === "pending");
    moderationList.innerHTML = "";
    if (!pending.length) {
        moderationList.innerHTML = "<div class=\"recent-item\">No messages awaiting review.</div>";
        return;
    }
    pending.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "moderation-item";
        item.innerHTML = `
            <div><strong>${maskEmail(entry.recipientEmail)}</strong> · ${formatDate(entry.createdAt)}</div>
            <div>${sanitizeMessage(entry.message)}</div>
            <div class="moderation-actions">
                <button class="btn btn-secondary btn-small" data-approve="${entry.id}">Approve</button>
                <button class="btn btn-secondary btn-small" data-reject="${entry.id}">Reject</button>
            </div>
        `;
        moderationList.appendChild(item);
    });
};

const renderAdmin = async () => {
    const messages = getMessages();
    const sentMessages = messages.filter((msg) => msg.status === "sent");
    const anonymousTotal = sentMessages.filter((msg) => msg.anonymous).length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCount = sentMessages.filter((msg) => msg.createdAt.slice(0, 10) === todayKey).length;
    const failedCount = messages.filter((msg) => msg.status === "failed").length;
    const campaign = await refreshCampaignState();

    totalSent.textContent = campaign.sent_count.toString();
    sentToday.textContent = todayCount.toString();
    anonymousSigned.textContent = `${anonymousTotal} / ${sentMessages.length - anonymousTotal}`;
    deliveryStatus.textContent = isCampaignUnlocked(campaign)
        ? "Unlimited"
        : `${campaign.sent_count} / ${campaign.free_limit}`;

    renderCharts(messages);

    const settings = getSettings();
    moderationCard.classList.toggle("hidden", !settings.moderation);
    if (settings.moderation) {
        renderModerationQueue(messages);
    }
    await applyCampaignState();
    renderRecentList(messages);
};

const handleCopy = async (value) => {
    if (!value) {
        return;
    }
    try {
        await navigator.clipboard.writeText(value);
    } catch (error) {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    }
};

const seedDemoData = async () => {
    const samples = [
        {
            message: "You make every day brighter.",
            recipientEmail: "bright@love.com",
            anonymous: false,
            senderName: "A.",
            template: "Sweet",
        },
        {
            message: "Thanks for being my favorite person.",
            recipientEmail: "favorite@love.com",
            anonymous: true,
            senderName: "",
            template: "Grateful",
        },
        {
            message: "Your kindness is my favorite habit.",
            recipientEmail: "kind@love.com",
            anonymous: false,
            senderName: "M.",
            template: "Friendly",
        },
    ];
    const now = new Date();
    const messages = getMessages();
    const payloads = [];
    samples.forEach((sample, index) => {
        const date = new Date(now);
        date.setDate(now.getDate() - index);
        const recipientDomain = sample.recipientEmail.split("@")[1] || "";
        const messageId = crypto.randomUUID ? crypto.randomUUID() : generateToken(10);
        const createdAt = date.toISOString();
        messages.unshift({
            id: messageId,
            createdAt,
            message: sample.message,
            recipientEmail: sample.recipientEmail,
            recipientDomain,
            anonymous: sample.anonymous,
            senderName: sample.senderName,
            senderEmail: "",
            senderKey: "browser",
            copyRequested: false,
            image: null,
            status: "sent",
            template: sample.template,
            recipientLink: buildRecipientLink(messageId),
        });
        payloads.push({
            created_at: createdAt,
            recipient_email: sample.recipientEmail,
            sender_name: sample.senderName || "",
            anonymous: sample.anonymous,
            has_image: false,
            status: "sent",
        });
    });
    saveMessages(messages);
    for (const payload of payloads) {
        await recordCampaignSend(payload);
    }
    lockCampaignIfNeeded(getCampaign());
    renderAdmin();
};

const syncSettingsForm = () => {
    const settings = getSettings();
    campaignStart.value = settings.campaignStart;
    campaignEnd.value = settings.campaignEnd;
    rateLimit.value = settings.rateLimit;
    allowedDomains.value = settings.allowedDomains;
    blockLinks.checked = settings.blockLinks;
    profanityFilter.checked = settings.profanityFilter;
    moderationToggle.checked = settings.moderation;
    updateDomainRule();
};

const saveSettingsFromForm = () => {
    const settings = {
        campaignStart: campaignStart.value,
        campaignEnd: campaignEnd.value,
        rateLimit: Number(rateLimit.value) || 10,
        allowedDomains: allowedDomains.value,
        blockLinks: blockLinks.checked,
        profanityFilter: profanityFilter.checked,
        moderation: moderationToggle.checked,
    };
    saveSettings(settings);
    updateDomainRule();
};

const validateForm = () => {
    const settings = getSettings();
    const campaign = getCampaign();
    const messageText = valentineMessage.value.trim();
    const emailValue = recipientEmail.value.trim();
    const nameValue = senderName.value.trim();
    const senderEmailValue = senderEmail.value.trim();

    if (campaign.status === "locked") {
        sendBtn.disabled = true;
        return;
    }
    if (!messageText || !emailValue) {
        sendBtn.disabled = true;
        return;
    }
    if (!recipientEmail.checkValidity()) {
        sendBtn.disabled = true;
        return;
    }
    if (!anonymousToggle.checked && !nameValue) {
        sendBtn.disabled = true;
        return;
    }
    if (copyToggle.checked && !senderEmailValue) {
        sendBtn.disabled = true;
        return;
    }
    if (copyToggle.checked && !senderEmail.checkValidity()) {
        sendBtn.disabled = true;
        return;
    }
    if (copyToggle.checked && !isSenderEmailAllowed(senderEmailValue, settings)) {
        sendBtn.disabled = true;
        return;
    }
    if (!isCampaignActive(settings)) {
        sendBtn.disabled = true;
        return;
    }
    if (!isAllowedDomain(emailValue, settings)) {
        sendBtn.disabled = true;
        return;
    }
    sendBtn.disabled = false;
};

const renderRecipientView = (message) => {
    if (!message || message.status !== "sent") {
        recipientTitle.textContent = "This Valentine is not available.";
        recipientMessage.textContent = "The message is private or no longer active.";
        recipientImageWrap.classList.add("hidden");
        recipientSignature.classList.add("hidden");
        showView(recipientView);
        return;
    }
    recipientTitle.textContent = "A Valentine for you";
    recipientMessage.textContent = message.message;
    if (message.image) {
        recipientImage.src = message.image;
        recipientImageWrap.classList.remove("hidden");
    } else {
        recipientImageWrap.classList.add("hidden");
    }
    if (!message.anonymous && message.senderName) {
        recipientSignature.textContent = `From ${message.senderName}`;
        recipientSignature.classList.remove("hidden");
    } else {
        recipientSignature.classList.add("hidden");
    }
    showView(recipientView);
};

const setInitialView = async () => {
    const params = new URLSearchParams(window.location.search);
    const campaignParam = params.get(CAMPAIGN_PARAM);
    const adminParam = params.get(ADMIN_PARAM);
    const recipientId = params.get(RECIPIENT_PARAM);
    const unlockParam = params.get(UNLOCK_PARAM);

    syncSettingsForm();

    const campaignId = getCampaignId();
    if (adminParam) {
        adminToken = adminParam;
    }

    setAdminLinks();

    if (unlockParam) {
        await refreshCampaignState();
        const url = new URL(window.location.href);
        url.searchParams.delete(UNLOCK_PARAM);
        window.history.replaceState({}, "", url.toString());
    }

    if (recipientId) {
        const messages = getMessages();
        const match = messages.find((msg) => msg.id === recipientId);
        renderRecipientView(match);
        return;
    }

    const block = ensureCampaignRequestBlock();
    block.classList.remove("hidden");
    const button = block.querySelector("#getCampaignBtn");
    if (button && !button.dataset.bound) {
        button.dataset.bound = "true";
        button.addEventListener("click", async () => {
            const created = await createCampaign();
            if (!created?.campaign_id || !created?.admin_token) {
                formMessage.textContent = "Unable to create a campaign right now.";
                return;
            }
            adminToken = created.admin_token;
            window.localStorage.setItem(`${ADMIN_TOKEN_PREFIX}${created.campaign_id}`, adminToken);
            window.localStorage.setItem(CAMPAIGN_ID_KEY, created.campaign_id);
            const url = new URL(created.admin_url, window.location.origin);
            window.history.replaceState({}, "", url.toString());
            setAdminLinks();
            await refreshCampaignState();
            await renderAdmin();
            showView(adminView);
        });
    }

    if (!campaignId && !campaignParam) {
        showView(composeView);
        sendBtn.disabled = true;
        formMessage.textContent = "Create a campaign link to start sending.";
        return;
    }

    await refreshCampaignState();
    if (adminToken && !isAdminSession) {
        formMessage.textContent = "This admin link is not valid for this campaign.";
    }

    if (isAdminSession) {
        await renderAdmin();
        showView(adminView);
        return;
    }

    showView(composeView);
    applyCampaignState();
};

anonymousToggle.addEventListener("change", () => {
    updateAnonymousToggle();
    validateForm();
});

copyToggle.addEventListener("change", () => {
    updateCopyToggle();
    validateForm();
});

valentineMessage.addEventListener("input", () => {
    updateCounter();
    validateForm();
});

recipientEmail.addEventListener("input", validateForm);
senderName.addEventListener("input", validateForm);
senderEmail.addEventListener("input", validateForm);

templateButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const key = button.dataset.template;
        const template = TEMPLATE_LIBRARY[key] || "";
        valentineMessage.value = template;
        updateCounter();
        validateForm();
    });
});

valentineImage.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (!file) {
        return;
    }
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        formMessage.textContent = "Please upload a JPG, PNG, or WebP image.";
        valentineImage.value = "";
        return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
        formMessage.textContent = "Image must be under 8 MB.";
        valentineImage.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        imagePayload = reader.result;
        imagePreviewImg.src = reader.result;
        imagePreviewName.textContent = file.name;
        imagePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
});

removeImageBtn.addEventListener("click", () => {
    imagePayload = null;
    valentineImage.value = "";
    imagePreviewImg.src = "";
    imagePreviewName.textContent = "";
    imagePreview.classList.add("hidden");
});

valentineForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";
    const settings = getSettings();
    const campaign = await fetchCampaignState();
    const messageText = valentineMessage.value.trim();
    const emailValue = recipientEmail.value.trim();
    const nameValue = senderName.value.trim();
    const senderEmailValue = senderEmail.value.trim();

    if (campaign.status === "locked") {
        formMessage.textContent = "This Valentine campaign has reached its limit. Please contact the campaign organizer.";
        trackEvent("attempt_send_after_limit", { campaignId: campaign.id });
        applyCampaignState();
        return;
    }
    if (!messageText) {
        formMessage.textContent = "Please write a message.";
        return;
    }
    if (!emailValue) {
        formMessage.textContent = "Recipient email is required.";
        return;
    }
    if (!recipientEmail.checkValidity()) {
        formMessage.textContent = "Please enter a valid recipient email.";
        return;
    }
    if (!isAllowedDomain(emailValue, settings)) {
        formMessage.textContent = "Recipient email domain is not allowed.";
        return;
    }
    if (!anonymousToggle.checked && !nameValue) {
        formMessage.textContent = "Please add your name or switch to anonymous.";
        return;
    }
    if (copyToggle.checked && !senderEmailValue) {
        formMessage.textContent = "Please add your email to receive a copy.";
        return;
    }
    if (copyToggle.checked && !senderEmail.checkValidity()) {
        formMessage.textContent = "Please enter a valid email for your copy.";
        return;
    }
    if (copyToggle.checked && !isSenderEmailAllowed(senderEmailValue, settings)) {
        formMessage.textContent = "Your email domain is not allowed.";
        return;
    }
    if (!isCampaignActive(settings)) {
        formMessage.textContent = "This campaign is not active right now.";
        return;
    }
    if (settings.blockLinks && containsBlockedLinks(messageText)) {
        formMessage.textContent = "Please remove links from your message.";
        return;
    }
    if (settings.profanityFilter && containsProfanity(messageText)) {
        formMessage.textContent = "Please edit your message to remove profanity.";
        return;
    }

    const messages = getMessages();
    const senderKey = getSenderKey();
    const limitCount = getRateLimitCount(messages, senderKey);
    if (settings.rateLimit && limitCount >= settings.rateLimit) {
        formMessage.textContent = "Daily limit reached. Please try again tomorrow.";
        return;
    }

    const recipientDomain = emailValue.split("@")[1] || "";
    const messageId = crypto.randomUUID ? crypto.randomUUID() : generateToken(10);
    const message = {
        id: messageId,
        createdAt: new Date().toISOString(),
        message: messageText,
        recipientEmail: emailValue,
        recipientDomain,
        anonymous: anonymousToggle.checked,
        senderName: anonymousToggle.checked ? "" : nameValue,
        senderEmail: copyToggle.checked ? senderEmailValue : "",
        senderKey,
        copyRequested: copyToggle.checked,
        image: imagePayload,
        status: settings.moderation ? "pending" : "sent",
        template: Object.keys(TEMPLATE_LIBRARY).find((key) => TEMPLATE_LIBRARY[key] === messageText) || "Custom",
        recipientLink: buildRecipientLink(messageId),
    };

    addMessage(message);
    if (message.status === "sent") {
        const payload = {
            created_at: message.createdAt,
            recipient_email: message.recipientEmail,
            sender_name: message.senderName || "",
            anonymous: message.anonymous,
            has_image: Boolean(message.image),
            status: message.status,
            recipient_link: message.recipientLink,
            copy_requested: message.copyRequested,
            sender_email: message.senderEmail,
        };
        const result = await recordCampaignSend(payload);
        if (result.error) {
            formMessage.textContent = result.error === "campaign_missing"
                ? "Create a campaign link to start sending."
                : result.error === "email_not_configured"
                    ? "Email delivery is not configured yet."
                    : "Delivery failed. Please try again.";
            return;
        }
        trackEvent("valentine_sent_success", { campaignId: result.campaign.id, messageId });
        lockCampaignIfNeeded(result.campaign);
    }
    resetForm();
    showView(thankYouView);
});

sendAnotherBtn.addEventListener("click", () => {
    showView(composeView);
    applyCampaignState();
});

copyShareBtn.addEventListener("click", async () => {
    await handleCopy(shareLink.value);
    if (copyStatus) {
        copyStatus.textContent = "Share link copied.";
        window.setTimeout(() => {
            copyStatus.textContent = "";
        }, 2000);
    }
});

recipientCta.addEventListener("click", () => {
    window.location.href = getBaseUrl();
});

if (brandHome) {
    brandHome.addEventListener("click", () => {
        window.history.replaceState({}, "", getBaseUrl());
        showView(composeView);
    });
}

adminBackBtn.addEventListener("click", () => {
    window.history.replaceState({}, "", getBaseUrl());
    showView(composeView);
    applyCampaignState();
});

copyLinkBtn.addEventListener("click", () => handleCopy(shareLink.value));
copyAdminBtn.addEventListener("click", () => handleCopy(adminShareLink.value));
copyShortBtn.addEventListener("click", async () => {
    if (copyShortBtn.dataset.mode === "unlock") {
        const campaign = await refreshCampaignState();
        trackEvent("checkout_started", { campaignId: campaign.id });
        if (STRIPE_CHECKOUT_URL) {
            window.location.href = STRIPE_CHECKOUT_URL;
            return;
        }
        const token = adminToken || getStoredAdminToken(campaign.id);
        const response = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaign_id: campaign.id, admin_token: token }),
        });
        const data = await response.json();
        if (data?.checkout_url) {
            window.location.href = data.checkout_url;
        }
        return;
    }
    handleCopy(shortLink.value);
});

downloadQrBtn.addEventListener("click", () => {
    if (!qrCodeImage.src) {
        return;
    }
    const link = document.createElement("a");
    link.href = qrCodeImage.src;
    link.download = "fast-valentine-qr.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

exportCsvBtn.addEventListener("click", async () => {
    const campaignId = getCampaignId();
    const token = adminToken || getStoredAdminToken(campaignId);
    const url = new URL("/api/export.csv", window.location.origin);
    url.searchParams.set("c", campaignId);
    if (token) {
        url.searchParams.set("admin", token);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
        return;
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fast-valentine.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});

seedDataBtn.addEventListener("click", () => {
    seedDemoData();
});

clearDataBtn.addEventListener("click", () => {
    saveMessages([]);
    renderAdmin();
});

saveSettingsBtn.addEventListener("click", () => {
    saveSettingsFromForm();
    renderAdmin();
});

moderationList.addEventListener("click", (event) => {
    const approveId = event.target.getAttribute("data-approve");
    const rejectId = event.target.getAttribute("data-reject");
    if (!approveId && !rejectId) {
        return;
    }
    const messages = getMessages();
    const targetId = approveId || rejectId;
    const message = messages.find((msg) => msg.id === targetId);
    if (!message) {
        return;
    }
    fetchCampaignState().then(async (campaign) => {
        if (approveId && campaign.status === "locked") {
            trackEvent("attempt_send_after_limit", { campaignId: campaign.id, messageId: message.id });
            return;
        }
        if (approveId) {
            message.status = "sent";
            const payload = {
                created_at: message.createdAt,
                recipient_email: message.recipientEmail,
                sender_name: message.senderName || "",
                anonymous: message.anonymous,
                has_image: Boolean(message.image),
                status: message.status,
                recipient_link: message.recipientLink,
                copy_requested: message.copyRequested,
                sender_email: message.senderEmail,
            };
            const result = await recordCampaignSend(payload);
            if (result.error) {
                message.status = "pending";
                saveMessages(messages);
                return;
            }
            trackEvent("valentine_sent_success", { campaignId: result.campaign.id, messageId: message.id });
            lockCampaignIfNeeded(result.campaign);
        }
        if (rejectId) {
            message.status = "blocked";
        }
        saveMessages(messages);
        renderAdmin();
    });
});

setInitialView();
updateAnonymousToggle();
updateCopyToggle();
updateCounter();
validateForm();
