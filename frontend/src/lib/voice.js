// ─────────────────────────────────────────────────────────────────────────────
// Voice (Product 2) shared client lib — API wrappers, formatters, status tones,
// and human-friendly provider/Twilio error mapping. Keep every Voice page thin
// by funnelling shared logic here.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "@/lib/api";

/* ── API wrappers ────────────────────────────────────────────────────────── */
export const voiceApi = {
  config: () => api.get("/voice/config").then((r) => r.data),
  dashboard: () => api.get("/voice/dashboard").then((r) => r.data),
  calls: (params = {}) => api.get("/voice/calls", { params }).then((r) => r.data),
  call: (id) => api.get(`/voice/calls/${id}`).then((r) => r.data),
  sessions: () => api.get("/voice/sessions").then((r) => r.data),
  endSession: (id) => api.delete(`/voice/session/${id}`),
  placeCall: (payload) => api.post("/voice/outgoing", payload).then((r) => r.data),
  resume: (id) => api.post(`/voice/calls/${id}/resume`).then((r) => r.data),
  transfers: (id) => api.get(`/voice/calls/${id}/transfers`).then((r) => r.data),
  // agent-scoped
  agents: (params = { limit: 100 }) => api.get("/agents", { params }).then((r) => r.data),
  voiceChannel: (agentId) => api.get(`/agents/${agentId}/channels/voice`).then((r) => r.data),
  voiceProfile: (agentId) => api.get(`/agents/${agentId}/voice-profile`).then((r) => r.data),
  saveVoiceProfile: (agentId, body) =>
    api.put(`/agents/${agentId}/voice-profile`, body).then((r) => r.data),
  receptionist: (agentId) => api.get(`/agents/${agentId}/receptionist`).then((r) => r.data),
  greetingPreview: (agentId) =>
    api.get(`/agents/${agentId}/receptionist/greeting-preview`).then((r) => r.data),
  testIntent: (agentId, text) =>
    api.post(`/agents/${agentId}/receptionist/test-intent`, { text }).then((r) => r.data),

  // ── Outbound campaigns (AI Campaign Builder) ──────────────────────────────
  campaigns: (params = {}) => api.get("/voice/campaigns", { params }).then((r) => r.data),
  campaign: (id) => api.get(`/voice/campaigns/${id}`).then((r) => r.data),
  createCampaign: (body) => api.post("/voice/campaigns", body).then((r) => r.data),
  updateCampaign: (id, body) => api.patch(`/voice/campaigns/${id}`, body).then((r) => r.data),
  deleteCampaign: (id) => api.delete(`/voice/campaigns/${id}`),
  campaignContacts: (id, params = {}) =>
    api.get(`/voice/campaigns/${id}/contacts`, { params }).then((r) => r.data),
  addCampaignContacts: (id, contacts) =>
    api.post(`/voice/campaigns/${id}/contacts`, { contacts }).then((r) => r.data),
  uploadCampaignContacts: (id, csvText) =>
    api
      .post(`/voice/campaigns/${id}/contacts/upload`, csvText, {
        headers: { "Content-Type": "text/csv" },
      })
      .then((r) => r.data),
  deleteCampaignContact: (id, contactId) =>
    api.delete(`/voice/campaigns/${id}/contacts/${contactId}`),
  startCampaign: (id) => api.post(`/voice/campaigns/${id}/start`).then((r) => r.data),
  pauseCampaign: (id) => api.post(`/voice/campaigns/${id}/pause`).then((r) => r.data),
  dispatchCampaign: (id) => api.post(`/voice/campaigns/${id}/dispatch`).then((r) => r.data),
  cloneCampaign: (id, copyContacts = true) =>
    api.post(`/voice/campaigns/${id}/clone`, null, { params: { copy_contacts: copyContacts } }).then((r) => r.data),
  archiveCampaign: (id) => api.post(`/voice/campaigns/${id}/archive`).then((r) => r.data),
  unarchiveCampaign: (id) => api.post(`/voice/campaigns/${id}/unarchive`).then((r) => r.data),
  exportCampaignContacts: (id) =>
    api.get(`/voice/campaigns/${id}/export`, { responseType: "blob" }).then((r) => r.data),
  campaignOptimization: (id) =>
    api.get(`/voice/campaigns/${id}/optimization`).then((r) => r.data),

  // ── Compliance · Do-Not-Call / suppression list ───────────────────────────
  suppressionList: (params = {}) =>
    api.get("/voice/compliance/suppression", { params }).then((r) => r.data),
  addSuppression: (body) =>
    api.post("/voice/compliance/suppression", body).then((r) => r.data),
  importSuppression: (body) =>
    api.post("/voice/compliance/suppression/import", body).then((r) => r.data),
  importSuppressionCsv: (csvText, reason = "dnd") =>
    api
      .post("/voice/compliance/suppression/import-csv", csvText, {
        headers: { "Content-Type": "text/csv" },
        params: { reason },
      })
      .then((r) => r.data),
  checkSuppression: (phone) =>
    api.get("/voice/compliance/suppression/check", { params: { phone } }).then((r) => r.data),
  optOutNumber: (body) => api.post("/voice/compliance/opt-out", body).then((r) => r.data),
  deleteSuppression: (id) => api.delete(`/voice/compliance/suppression/${id}`),

  // ── AI Sales Assistant ────────────────────────────────────────────────────
  salesProfile: (agentId) => api.get(`/agents/${agentId}/sales`).then((r) => r.data),
  saveSalesProfile: (agentId, body) => api.put(`/agents/${agentId}/sales`, body).then((r) => r.data),
  salesQualify: (agentId, body) => api.post(`/agents/${agentId}/sales/qualify`, body).then((r) => r.data),
  salesRecommend: (agentId, body) => api.post(`/agents/${agentId}/sales/recommend`, body).then((r) => r.data),
  salesQuote: (agentId, body) => api.post(`/agents/${agentId}/sales/quote`, body).then((r) => r.data),

  // ── Human Handoff · Tickets & Escalation ──────────────────────────────────
  tickets: (params) => api.get("/voice/tickets", { params }).then((r) => r.data),
  ticket: (id) => api.get(`/voice/tickets/${id}`).then((r) => r.data),
  updateTicket: (id, body) => api.patch(`/voice/tickets/${id}`, body).then((r) => r.data),
  createTicket: (agentId, body) => api.post(`/agents/${agentId}/support/tickets`, body).then((r) => r.data),

  // ── Appointment Engine & Callbacks ────────────────────────────────────────
  appointments: (params) => api.get("/voice/appointments", { params }).then((r) => r.data),
  checkAppointment: (body) => api.post("/voice/appointments/check", body).then((r) => r.data),
  createAppointment: (body) => api.post("/voice/appointments", body).then((r) => r.data),
  cancelAppointment: (id) => api.post(`/voice/appointments/${id}/cancel`).then((r) => r.data),
  callbacks: (params) => api.get("/voice/callbacks", { params }).then((r) => r.data),
  createCallback: (body) => api.post("/voice/callbacks", body).then((r) => r.data),

  // ── AI Voice Studio ───────────────────────────────────────────────────────
  voiceLibrary: (params) => api.get("/voice/voice-library", { params }).then((r) => r.data),
  voiceStyles: () => api.get("/voice/voice-styles").then((r) => r.data),
  languages: () => api.get("/voice/languages").then((r) => r.data),
  createVoice: (body) => api.post("/voice/voice-library", body).then((r) => r.data),
  updateVoice: (id, body) => api.patch(`/voice/voice-library/${id}`, body).then((r) => r.data),
  approveVoice: (id) => api.post(`/voice/voice-library/${id}/approve`).then((r) => r.data),
  revokeVoice: (id) => api.post(`/voice/voice-library/${id}/revoke`).then((r) => r.data),
  deleteVoice: (id) => api.delete(`/voice/voice-library/${id}`).then((r) => r.data),

  // ── AI Supervisor ─────────────────────────────────────────────────────────
  supervisorConsole: () => api.get("/voice/supervisor/console").then((r) => r.data),
  supervise: (callId, body) => api.post(`/voice/calls/${callId}/supervise`, body).then((r) => r.data),

  // ── AI Prompt Studio ──────────────────────────────────────────────────────
  promptTemplates: () => api.get("/voice/prompt-studio/templates").then((r) => r.data),
  generateBlueprint: (body) => api.post("/voice/prompt-studio/generate", body).then((r) => r.data),

  // ── AI Payment Assistant ──────────────────────────────────────────────────
  paymentProviders: () => api.get("/voice/payments/providers").then((r) => r.data),
  payments: (params) => api.get("/voice/payments", { params }).then((r) => r.data),
  payment: (id) => api.get(`/voice/payments/${id}`).then((r) => r.data),
  createPayment: (body) => api.post("/voice/payments", body).then((r) => r.data),
  updatePaymentStatus: (id, body) => api.post(`/voice/payments/${id}/status`, body).then((r) => r.data),

  // ── AI Document Assistant ─────────────────────────────────────────────────
  documentKinds: () => api.get("/voice/documents/kinds").then((r) => r.data),
  documents: (params) => api.get("/voice/documents", { params }).then((r) => r.data),
  document: (id) => api.get(`/voice/documents/${id}`).then((r) => r.data),
  createDocument: (body) => api.post("/voice/documents", body).then((r) => r.data),
  extractDocument: (id) => api.post(`/voice/documents/${id}/extract`).then((r) => r.data),
  verifyDocument: (id, body) => api.post(`/voice/documents/${id}/verify`, body).then((r) => r.data),
};

// Campaign types (the "goal" field). Each maps to a short script hint the
// agent uses; these are the AI Campaign Builder use-cases.
export const CAMPAIGN_TYPES = [
  { value: "cold_calling", label: "Cold Calling", desc: "Introduce your product to fresh prospects.", tone: "#2563EB", bg: "#EFF4FF" },
  { value: "lead_followup", label: "Lead Follow-up", desc: "Re-engage warm leads and move them forward.", tone: "#7C3AED", bg: "#F5F3FF" },
  { value: "appointment_reminder", label: "Appointment Reminder", desc: "Remind customers of upcoming bookings.", tone: "#16A34A", bg: "#ECFDF3" },
  { value: "emi_reminder", label: "EMI Reminder", desc: "Gentle reminders for upcoming installments.", tone: "#EA580C", bg: "#FFF7ED" },
  { value: "feedback", label: "Feedback", desc: "Collect post-purchase or post-service feedback.", tone: "#0EA5E9", bg: "#EFF8FF" },
  { value: "survey", label: "Survey", desc: "Run structured surveys at scale.", tone: "#DB2777", bg: "#FDF2F8" },
  { value: "product_launch", label: "Product Launch", desc: "Announce a new product to your audience.", tone: "#9333EA", bg: "#FAF5FF" },
  { value: "festival_offer", label: "Festival Offers", desc: "Promote seasonal and festival discounts.", tone: "#D97706", bg: "#FFFBEB" },
  { value: "payment_collection", label: "Payment Collection", desc: "Follow up on pending or overdue payments.", tone: "#DC2626", bg: "#FEF2F2" },
  { value: "customer_retention", label: "Customer Retention", desc: "Win back at-risk and churning customers.", tone: "#0D9488", bg: "#F0FDFA" },
];

export const CAMPAIGN_STATUS_TONE = {
  draft: "slate",
  scheduled: "indigo",
  running: "blue",
  paused: "amber",
  completed: "green",
  canceled: "red",
  archived: "slate",
};

/* ── Status tone maps (align with kit Badge tones) ───────────────────────── */
export const CALL_STATUS_TONE = {
  completed: "green",
  in_progress: "blue",
  ringing: "indigo",
  queued: "slate",
  transferred: "amber",
  voicemail: "amber",
  failed: "red",
  busy: "red",
  no_answer: "red",
  canceled: "slate",
};

export const CALL_STATUS_LABEL = {
  in_progress: "Live",
  no_answer: "No answer",
};
export const statusLabel = (s) =>
  CALL_STATUS_LABEL[s] || (s ? s.replace(/_/g, " ") : "—");

/* ── Formatters ──────────────────────────────────────────────────────────── */
export function fmtDuration(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${r}s` : `${r}s`;
}

export function fmtMs(ms) {
  const n = Number(ms) || 0;
  if (!n) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

export function fmtMoney(value, { digits = 2 } = {}) {
  const n = Number(value) || 0;
  return `$${n.toFixed(digits)}`;
}

export function fmtPct(fraction, { digits = 0 } = {}) {
  const n = Number(fraction) || 0;
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function fmtRelative(ts) {
  if (!ts) return "—";
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  return fmtTime(ts);
}

/* Format an E.164-ish number for display, keeping it readable. */
export function fmtPhone(num) {
  if (!num) return "—";
  const s = String(num).trim();
  return s;
}

/* ── Friendly provider / Twilio error mapping ────────────────────────────────
   Never surface raw backend / Twilio JSON. Map known failure shapes into a
   { title, reason, fix, docs, retryable } object the UI can render nicely.
   ──────────────────────────────────────────────────────────────────────────*/
const TWILIO_ERROR_MAP = {
  21211: {
    title: "Invalid phone number",
    reason: "The destination number isn't a valid, dialable phone number.",
    fix: "Use full international format, e.g. +14155551234.",
    docs: "https://www.twilio.com/docs/errors/21211",
  },
  21214: {
    title: "Number can't receive calls",
    reason: "Twilio couldn't route a call to this number.",
    fix: "Double-check the number and country code, then try again.",
    docs: "https://www.twilio.com/docs/errors/21214",
  },
  21216: {
    title: "Number not reachable",
    reason: "This destination number is unroutable or not a real line.",
    fix: "Verify the number is a working phone that can receive calls.",
    docs: "https://www.twilio.com/docs/errors/21216",
  },
  21219: {
    title: "Number not verified",
    reason: "Trial accounts can only call numbers you've verified in Twilio.",
    fix: "Verify this number in the Twilio Console, or upgrade your account.",
    docs: "https://www.twilio.com/docs/errors/21219",
  },
  21608: {
    title: "Number not verified",
    reason: "Your Twilio trial can only dial verified caller IDs.",
    fix: "Add and verify this number under Verified Caller IDs in Twilio.",
    docs: "https://www.twilio.com/docs/errors/21608",
  },
  20003: {
    title: "Authentication failed",
    reason: "Twilio rejected the account credentials.",
    fix: "Check your Twilio Account SID and Auth Token in Integrations.",
    docs: "https://www.twilio.com/docs/errors/20003",
  },
  20429: {
    title: "Too many requests",
    reason: "You've hit Twilio's rate limit for now.",
    fix: "Wait a few seconds and retry.",
    docs: "https://www.twilio.com/docs/errors/20429",
  },
};

const KEYWORD_RULES = [
  {
    test: /insufficient|balance|funds|payment/i,
    title: "Insufficient balance",
    reason: "There aren't enough funds on the provider account to place this call.",
    fix: "Top up your Twilio balance, then retry.",
    docs: "https://www.twilio.com/console/billing",
  },
  {
    test: /unverified|not verified|verified caller/i,
    title: "Number not verified",
    reason: "Trial accounts can only call verified numbers.",
    fix: "Verify the destination number in the Twilio Console.",
    docs: "https://www.twilio.com/console/phone-numbers/verified",
  },
  {
    test: /trial/i,
    title: "Trial account restriction",
    reason: "Your Twilio account is in trial mode, which limits outbound calls.",
    fix: "Upgrade your Twilio account, or call a verified number.",
    docs: "https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account",
  },
  {
    test: /network|timeout|timed out|unreachable|ECONN|getaddrinfo/i,
    title: "Network issue",
    reason: "We couldn't reach the telephony provider just now.",
    fix: "Check your connection and try again in a moment.",
    docs: null,
  },
  {
    test: /not configured|missing|credential|api key|unauthorized|401/i,
    title: "Provider not connected",
    reason: "A required provider credential is missing or invalid.",
    fix: "Connect the provider under Integrations and try again.",
    docs: null,
  },
];

/**
 * Turn any error (Axios error, backend payload, or a place-call response with
 * status:"failed") into a friendly, structured object for the UI.
 */
export function friendlyVoiceError(input) {
  const fallback = {
    title: "Something went wrong",
    reason: "We couldn't complete that action.",
    fix: "Please try again. If it keeps happening, contact support.",
    docs: null,
    retryable: true,
    code: null,
  };

  if (!input) return fallback;

  // Extract a message + possible twilio code from many shapes.
  const data = input?.response?.data ?? input?.data ?? input;
  const rawMessage =
    (typeof input === "string" && input) ||
    data?.detail?.message ||
    (typeof data?.detail === "string" ? data.detail : null) ||
    data?.message ||
    data?.error ||
    input?.message ||
    "";
  const code =
    data?.code ||
    data?.twilio_code ||
    data?.detail?.code ||
    (rawMessage.match(/\b(2\d{4})\b/) || [])[1] ||
    null;

  if (code && TWILIO_ERROR_MAP[code]) {
    return { ...TWILIO_ERROR_MAP[code], retryable: true, code: String(code) };
  }

  for (const rule of KEYWORD_RULES) {
    if (rawMessage && rule.test.test(rawMessage)) {
      return {
        title: rule.title,
        reason: rule.reason,
        fix: rule.fix,
        docs: rule.docs,
        retryable: true,
        code: code ? String(code) : null,
      };
    }
  }

  return {
    ...fallback,
    reason: rawMessage ? String(rawMessage).slice(0, 200) : fallback.reason,
    code: code ? String(code) : null,
  };
}

/* Heuristic trial detection from the /voice/config or a known account flag. */
export function isTrialAccount(config) {
  if (!config) return false;
  return Boolean(config.trial || config.twilio_trial || config.account_trial);
}

/* Provider display metadata for the system-status hero. */
export const PROVIDER_META = {
  twilio: { label: "Twilio", desc: "Telephony" },
  deepgram: { label: "Deepgram", desc: "Speech-to-Text" },
  elevenlabs: { label: "ElevenLabs", desc: "Text-to-Speech" },
  openrouter: { label: "OpenRouter", desc: "Language Model" },
  memory: { label: "Memory", desc: "Conversation state" },
  vector: { label: "Vector DB", desc: "Knowledge retrieval" },
};
