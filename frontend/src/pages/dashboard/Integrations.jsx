import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plug,
  Mail,
  Calendar,
  MessageCircle,
  MessageSquare,
  Database,
  Webhook,
  KeyRound,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
  X,
  Copy,
  Check,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  ArrowRight,
  Filter,
  ChevronDown,
  Clock,
  Sparkles,
  Cloud,
  CreditCard,
  ShoppingBag,
  PenLine,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────── */
/*  Integration catalog                                                 */
/* ──────────────────────────────────────────────────────────────────── */
const INTEGRATIONS = [
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    desc: "Auto-create leads, summarise threads and trigger workflows from inbox.",
    icon: Mail,
    color: "#EA4335",
    bg: "#FEE2E2",
    status: "connected",
    health: "healthy",
    lastSync: "2 mins ago",
    config: [
      { id: "inbox", label: "Read Inbox", on: true },
      { id: "sent", label: "Read Sent Mail", on: false },
      { id: "leads", label: "Create Leads from Emails", on: true },
      { id: "summary", label: "AI Email Summaries", on: true },
    ],
  },
  {
    id: "gcal",
    name: "Google Calendar",
    category: "Calendar",
    desc: "Book meetings, schedule appointments and send reminders automatically.",
    icon: Calendar,
    color: "#1A73E8",
    bg: "#DBEAFE",
    status: "connected",
    health: "healthy",
    lastSync: "8 mins ago",
    config: [
      { id: "create", label: "Create Meetings", on: true },
      { id: "schedule", label: "Schedule Appointments", on: true },
      { id: "booking", label: "Agent Booking Automation", on: true },
      { id: "remind", label: "Reminder Notifications", on: false },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    desc: "Bi-directional sync of contacts, deals and pipelines with HubSpot CRM.",
    icon: Database,
    color: "#FF7A59",
    bg: "#FFEDD5",
    status: "connected",
    health: "healthy",
    lastSync: "1 min ago",
    config: [
      { id: "contacts", label: "Sync Contacts", on: true },
      { id: "deals",    label: "Sync Deals",    on: true },
      { id: "pipelines",label: "Update Pipelines", on: true },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    desc: "Real-time alerts for new leads, escalations and low-confidence replies.",
    icon: MessageSquare,
    color: "#4A154B",
    bg: "#EDE9FE",
    status: "connected",
    health: "warning",
    lastSync: "1 hour ago",
    config: [
      { id: "leads", label: "Notify on New Leads", on: true },
      { id: "esc",   label: "Notify on Escalations", on: true },
      { id: "lowc",  label: "Low-Confidence Alerts", on: false },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    desc: "Connect your WhatsApp Business number and run AI agents at scale.",
    icon: MessageCircle,
    color: "#25D366",
    bg: "#DCFCE7",
    status: "connected",
    health: "healthy",
    lastSync: "30 secs ago",
    config: [
      { id: "phone",  label: "Phone Number Status",      on: true,  read: true, value: "+91 98765 43210" },
      { id: "meta",   label: "Meta Verification Status", on: true,  read: true, value: "Verified" },
      { id: "tpl",    label: "Template Approval Status", on: true,  read: true, value: "12 approved · 1 pending" },
      { id: "analytics", label: "Conversation Analytics", on: true },
    ],
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    category: "CRM",
    desc: "Push qualified leads and transcripts into Zoho with custom mapping.",
    icon: Database,
    color: "#C8202F",
    bg: "#FEE2E2",
    status: "not_connected",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    desc: "Enterprise CRM sync for leads, accounts and opportunities.",
    icon: Cloud,
    color: "#00A1E0",
    bg: "#DBEAFE",
    status: "not_connected",
    roadmap: false,
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    category: "Email",
    desc: "Mail and calendar integration for Microsoft 365 workspaces.",
    icon: Mail,
    color: "#0078D4",
    bg: "#DBEAFE",
    status: "not_connected",
    roadmap: false,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "Communication",
    desc: "Push agent notifications and lead alerts into Teams channels.",
    icon: MessageSquare,
    color: "#6264A7",
    bg: "#EDE9FE",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    category: "Support",
    desc: "Open tickets automatically from escalated AI conversations.",
    icon: SettingsIcon,
    color: "#03363D",
    bg: "#E0F2FE",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    category: "Support",
    desc: "Sync conversations and tickets with Freshdesk in real time.",
    icon: SettingsIcon,
    color: "#25C16F",
    bg: "#DCFCE7",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    desc: "Collect payments and create invoices straight from conversations.",
    icon: CreditCard,
    color: "#0D2366",
    bg: "#DBEAFE",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    desc: "Accept global payments, manage subscriptions and refunds.",
    icon: CreditCard,
    color: "#635BFF",
    bg: "#EDE9FE",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "E-Commerce",
    desc: "Order lookups, abandoned-cart recovery and customer support.",
    icon: ShoppingBag,
    color: "#7AB55C",
    bg: "#DCFCE7",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "E-Commerce",
    desc: "WhatsApp store sync — orders, products and customer data.",
    icon: ShoppingBag,
    color: "#7F54B3",
    bg: "#EDE9FE",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM",
    desc: "Create deals and stages from qualified conversations.",
    icon: Database,
    color: "#1A1A1A",
    bg: "#F1F5F9",
    status: "not_connected",
    roadmap: true,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    desc: "Knowledge base auto-sync from Notion pages and databases.",
    icon: PenLine,
    color: "#0F0F0F",
    bg: "#F1F5F9",
    status: "not_connected",
    roadmap: true,
  },
];

const CATEGORIES = ["All", "CRM", "Email", "Calendar", "Messaging", "Communication", "Support", "Payments", "E-Commerce", "Productivity"];

/* ──────────────────────────────────────────────────────────────────── */
const SYNC_ACTIVITY = [
  { id: "s1", time: "10:15 AM", integration: "Gmail",     activity: "New lead created from email reply",     tone: "#16A34A" },
  { id: "s2", time: "10:17 AM", integration: "HubSpot",   activity: "Contact synced · Aarav Mehta",          tone: "#2563EB" },
  { id: "s3", time: "10:20 AM", integration: "WhatsApp",  activity: "Message received from +91 98765 43210", tone: "#16A34A" },
  { id: "s4", time: "10:22 AM", integration: "Slack",     activity: "Lead alert posted in #sales",           tone: "#7C3AED" },
  { id: "s5", time: "10:25 AM", integration: "Gmail",     activity: "AI summary generated · 3-thread digest",tone: "#16A34A" },
  { id: "s6", time: "10:28 AM", integration: "Google Cal",activity: "Appointment booked · 4:00 PM tomorrow", tone: "#0EA5E9" },
];

const WEBHOOKS = [
  { id: "wh1", url: "https://api.acme.com/oraone/leads",          events: ["lead.created", "lead.qualified"], status: "active",   lastDelivery: "30 secs ago" },
  { id: "wh2", url: "https://hooks.zapier.com/hooks/oraone/x9k2", events: ["conversation.escalated"],         status: "active",   lastDelivery: "5 mins ago" },
  { id: "wh3", url: "https://backup.internal/oraone",             events: ["lead.created"],                   status: "failing",  lastDelivery: "Failed · 2 hours ago" },
];

const API_KEYS = [
  { id: "k1", name: "Production",  prefix: "sk_live_a2c1…f9d3", created: "Jan 10, 2026", used: "2 mins ago",  scope: "Full access" },
  { id: "k2", name: "Staging",     prefix: "sk_test_b6e2…21fa", created: "Feb 04, 2026", used: "Yesterday",   scope: "Read/Write" },
  { id: "k3", name: "Analytics RO",prefix: "sk_live_d0a7…7bc4", created: "Feb 09, 2026", used: "1 hour ago",  scope: "Read-only" },
];

const API_USAGE = [
  { label: "Requests Today",      value: "24,182", icon: Activity,   tone: "#2563EB", bg: "#EFF6FF" },
  { label: "Requests This Month", value: "612,440",icon: TrendingUp, tone: "#7C3AED", bg: "#EDE9FE" },
  { label: "Error Rate",          value: "0.34%",  icon: AlertTriangle, tone: "#F59E0B", bg: "#FEF3C7" },
  { label: "Avg Response Time",   value: "182ms",  icon: Clock,      tone: "#16A34A", bg: "#DCFCE7" },
];

/* ──────────────────────────────────────────────────────────────────── */
export default function Integrations() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [copied, setCopied] = useState(null);
  const [showKey, setShowKey] = useState({});

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return INTEGRATIONS.filter((i) => {
      if (cat !== "All" && i.category !== cat) return false;
      if (s && !i.name.toLowerCase().includes(s) && !i.desc.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [q, cat]);

  const connected = INTEGRATIONS.filter((i) => i.status === "connected");

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch (e) { /* clipboard unavailable */ }
  };

  const toggleConfig = (intId, cfgId) => {
    setOverrides((p) => ({ ...p, [`${intId}:${cfgId}`]: !cfgValue(intId, cfgId) }));
  };

  const cfgValue = (intId, cfgId) => {
    const k = `${intId}:${cfgId}`;
    if (k in overrides) return overrides[k];
    const intg = INTEGRATIONS.find((i) => i.id === intId);
    return intg?.config?.find((c) => c.id === cfgId)?.on || false;
  };

  return (
    <div className="space-y-8" data-testid="integrations-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.18em] text-[#2563EB] uppercase">
            Integrations
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#0F172A]">
            Connect the tools you already use.
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Marketplace, configuration, sync logs, webhooks and API keys — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="refresh-status"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Integration Health */}
      <Section title="Integration Health" subtitle="Live status of every connected integration" icon={Activity}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="health-grid">
          {connected.map((i) => (
            <div
              key={i.id}
              className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:shadow-premium transition-all"
              data-testid={`health-${i.id}`}
            >
              <div className="flex items-center justify-between">
                <span className="size-9 rounded-xl grid place-items-center" style={{ background: i.bg }}>
                  <i.icon size={16} style={{ color: i.color }} />
                </span>
                <HealthBadge status={i.health} />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">{i.name}</p>
              <p className="text-[11.5px] text-[#64748B] mt-0.5 flex items-center gap-1">
                <Clock size={10} /> Last sync · {i.lastSync}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Marketplace */}
      <Section title="Integration Marketplace" subtitle={`${INTEGRATIONS.length} integrations · ${connected.length} connected`} icon={Plug}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search integrations…"
                data-testid="int-search"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  data-testid={`int-cat-${c.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    cat === c
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="int-grid">
            {list.map((i) => (
              <motion.button
                key={i.id}
                onClick={() => setSelected(i.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid={`int-card-${i.id}`}
                className="text-left p-5 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 hover:shadow-premium transition-all relative"
              >
                {i.roadmap && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded-full">
                    COMING SOON
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="size-11 rounded-xl grid place-items-center" style={{ background: i.bg }}>
                    <i.icon size={20} style={{ color: i.color }} />
                  </span>
                  <StatusPill status={i.status} />
                </div>
                <p className="mt-3 text-[14.5px] font-semibold text-[#0F172A]">{i.name}</p>
                <p className="text-[10.5px] text-[#94A3B8] uppercase tracking-wider font-bold">{i.category}</p>
                <p className="mt-2 text-[12.5px] text-[#64748B] leading-snug">{i.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </Section>

      {/* Sync Activity */}
      <Section title="Sync Activity Logs" subtitle="Real-time stream of integration events" icon={Activity}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto" data-testid="sync-activity">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <Th>Time</Th>
                <Th>Integration</Th>
                <Th>Activity</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {SYNC_ACTIVITY.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-5 py-3 text-[12.5px] text-[#64748B] font-mono whitespace-nowrap">{s.time}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-semibold"
                      style={{ background: `${s.tone}15`, color: s.tone }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: s.tone }} />
                      {s.integration}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#0F172A]">{s.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Webhooks */}
      <Section title="Webhook Management" subtitle="Receive real-time events on your own endpoints" icon={Webhook}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden" data-testid="webhooks">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
            <p className="text-[12.5px] font-semibold text-[#0F172A]">{WEBHOOKS.length} endpoints</p>
            <button
              data-testid="webhook-add"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold"
            >
              <Plus size={12} /> Generate Webhook URL
            </button>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {WEBHOOKS.map((w) => (
              <div key={w.id} className="px-5 py-4 flex flex-wrap items-center gap-3" data-testid={`webhook-${w.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[12.5px] font-mono text-[#0F172A] truncate">{w.url}</code>
                    <button
                      onClick={() => handleCopy(w.url, w.id)}
                      className="text-[#94A3B8] hover:text-[#2563EB]"
                    >
                      {copied === w.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {w.events.map((e) => (
                      <span key={e} className="text-[10.5px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                        {e}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1.5">{w.lastDelivery}</p>
                </div>
                <div className="flex items-center gap-2">
                  {w.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} /> Failing
                    </span>
                  )}
                  <button data-testid={`webhook-regen-${w.id}`} className="size-7 rounded-md hover:bg-[#F1F5F9] grid place-items-center text-[#475569]" title="Regenerate Secret">
                    <RotateCw size={12} />
                  </button>
                  <button data-testid={`webhook-retry-${w.id}`} className="size-7 rounded-md hover:bg-[#F1F5F9] grid place-items-center text-[#475569]" title="Retry">
                    <RefreshCw size={12} />
                  </button>
                  <button data-testid={`webhook-delete-${w.id}`} className="size-7 rounded-md hover:bg-[#FEE2E2] grid place-items-center text-[#DC2626]" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* API Keys + Usage */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Section title="API Keys" subtitle="Manage keys, scopes and rotation" icon={KeyRound}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden" data-testid="api-keys">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <p className="text-[12.5px] font-semibold text-[#0F172A]">{API_KEYS.length} keys</p>
                <button
                  data-testid="apikey-generate"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold"
                >
                  <Plus size={12} /> Generate API Key
                </button>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {API_KEYS.map((k) => (
                  <div key={k.id} className="px-5 py-4 flex flex-wrap items-center gap-3" data-testid={`apikey-${k.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#0F172A]">{k.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[12px] font-mono text-[#64748B]">
                          {showKey[k.id] ? k.prefix.replace("…", "x9b4f3a01c") : k.prefix}
                        </code>
                        <button
                          onClick={() => setShowKey((p) => ({ ...p, [k.id]: !p[k.id] }))}
                          className="text-[#94A3B8] hover:text-[#2563EB]"
                          data-testid={`apikey-show-${k.id}`}
                        >
                          {showKey[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => handleCopy(k.prefix, `key-${k.id}`)} className="text-[#94A3B8] hover:text-[#2563EB]">
                          {copied === `key-${k.id}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        {k.scope} · Created {k.created} · Last used {k.used}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button data-testid={`apikey-rotate-${k.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF]">
                        <RotateCw size={11} /> Rotate
                      </button>
                      <button data-testid={`apikey-revoke-${k.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-[#DC2626] hover:bg-[#FEE2E2]">
                        <Trash2 size={11} /> Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="API Usage Dashboard" subtitle="Live rate-limit and performance" icon={TrendingUp}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-3" data-testid="api-usage">
              {API_USAGE.map((u) => (
                <div key={u.label} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB]/30 transition-colors">
                  <span className="size-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: u.bg }}>
                    <u.icon size={15} style={{ color: u.tone }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] text-[#64748B]">{u.label}</p>
                    <p className="text-lg font-black text-[#0F172A] tabular-nums">{u.value}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-[11px] text-[#64748B] mb-1.5">Rate limit · 60% used</p>
                <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <DetailDrawer
            integration={INTEGRATIONS.find((i) => i.id === selected)}
            onClose={() => setSelected(null)}
            cfgValue={cfgValue}
            toggleConfig={toggleConfig}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
function DetailDrawer({ integration, onClose, cfgValue, toggleConfig }) {
  if (!integration) return null;
  const isConnected = integration.status === "connected";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm"
      data-testid="int-detail-drawer"
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto"
      >
        <div className="p-6 border-b border-[#E2E8F0]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-2xl grid place-items-center" style={{ background: integration.bg }}>
                <integration.icon size={22} style={{ color: integration.color }} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">{integration.name}</h3>
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-bold">{integration.category}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]" data-testid="int-detail-close">
              <X size={18} />
            </button>
          </div>
          <StatusPill status={integration.status} large />
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#2563EB] mb-2">OVERVIEW</p>
            <p className="text-[13.5px] text-[#475569] leading-relaxed">{integration.desc}</p>
            <ul className="mt-3 space-y-1.5">
              {["Read customer data", "Auto-create leads", "Generate AI summaries", "Trigger workflows"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-[13px] text-[#0F172A]">
                  <CheckCircle2 size={12} className="text-[#16A34A]" /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Connection */}
          {!isConnected && (
            <button
              data-testid="int-connect-cta"
              className="w-full px-4 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plug size={14} /> Connect {integration.name}
            </button>
          )}

          {/* Config */}
          {isConnected && integration.config && (
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#2563EB] mb-3">CONFIGURATION</p>
              <div className="space-y-2">
                {integration.config.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0]">
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#0F172A]">{c.label}</p>
                      {c.value && <p className="text-[11.5px] text-[#64748B] mt-0.5">{c.value}</p>}
                    </div>
                    {c.read ? (
                      <span className="text-[11px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                        ENABLED
                      </span>
                    ) : (
                      <Toggle on={cfgValue(integration.id, c.id)} onChange={() => toggleConfig(integration.id, c.id)} testid={`int-toggle-${integration.id}-${c.id}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test + Disconnect */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                data-testid="int-test"
                className="px-3 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} /> Test Integration
              </button>
              <button
                data-testid="int-disconnect"
                className="px-3 py-2.5 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <XCircle size={13} /> Disconnect
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
function StatusPill({ status, large }) {
  if (status === "connected") {
    return (
      <span className={`inline-flex items-center gap-1 ${large ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[10.5px]"} rounded-full bg-[#DCFCE7] text-[#15803D] font-semibold`}>
        <span className="size-1.5 rounded-full bg-[#16A34A]" />
        Connected
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${large ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[10.5px]"} rounded-full bg-[#FEE2E2] text-[#B91C1C] font-semibold`}>
      <span className="size-1.5 rounded-full bg-[#DC2626]" />
      Not Connected
    </span>
  );
}

function HealthBadge({ status }) {
  if (status === "healthy") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold tracking-wider">
        <CheckCircle2 size={9} /> HEALTHY
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold tracking-wider">
        <AlertTriangle size={9} /> WARNING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-bold tracking-wider">
      <XCircle size={9} /> ERROR
    </span>
  );
}

function Toggle({ on, onChange, testid }) {
  return (
    <button
      onClick={onChange}
      data-testid={testid}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="size-7 rounded-lg bg-[#EFF6FF] grid place-items-center">
          <Icon size={14} className="text-[#2563EB]" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-3 text-left text-[11px] font-bold tracking-wider text-[#64748B] uppercase whitespace-nowrap">
      {children}
    </th>
  );
}
