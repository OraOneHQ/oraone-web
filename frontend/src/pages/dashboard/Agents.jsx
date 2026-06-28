import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Phone,
  MessageSquare,
  MessageCircle,
  Bot,
  Power,
  PauseCircle,
  AlertTriangle,
  Trash2,
  Sparkles,
  Users,
  Rocket,
  Zap,
  Wand2,
  LineChart,
  ArrowRight,
  MoreVertical,
  Copy,
  ExternalLink,
  Cpu,
  Clock,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { DASH } from "@/constants/testIds";
import { PageHeader } from "@/components/dashboard/kit";

const TYPE_META = {
  voice:    { icon: Phone,         color: "#2563EB", label: "Voice Agent",    desc: "Answers calls and talks like a human." },
  chat:     { icon: MessageSquare, color: "#7C3AED", label: "Chat Agent",     desc: "Chats on your website and engages visitors." },
  whatsapp: { icon: MessageCircle, color: "#22C55E", label: "WhatsApp Agent", desc: "AI that replies on WhatsApp." },
};

// Agents behave like cloud services: Draft → Active ⇄ Paused → Archived.
const STATUS_META = {
  draft:    { label: "Draft",    dot: "#94A3B8", badge: "bg-[#F1F5F9] text-[#475569]" },
  active:   { label: "Active",   dot: "#22C55E", badge: "bg-green-50 text-green-700" },
  paused:   { label: "Paused",   dot: "#F59E0B", badge: "bg-amber-50 text-amber-700" },
  archived: { label: "Archived", dot: "#64748B", badge: "bg-[#E2E8F0] text-[#475569]" },
};

const fmtRelative = (iso) => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function Agents() {
  const nav = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/agents");
      // Phase 6: list endpoint returns { items, total, limit, offset }
      setAgents(Array.isArray(data) ? data : data?.items || []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (a, newStatus) => {
    try {
      // Partial-update PUT — only send the changed field.
      await api.put(`/agents/${a.id}`, { status: newStatus });
      load();
      toast.success(newStatus === "active" ? "Agent activated" : `Agent ${newStatus}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  // Cloud-service toggle: Active ⇄ Paused. An agent can only switch ON once
  // it meets the minimum requirements (a system prompt).
  const toggleStatus = (a) => {
    if (a.status === "active") return setStatus(a, "paused");
    if (a.is_ready === false) {
      toast.error("Agent is incomplete — add a system prompt before activating.");
      return;
    }
    return setStatus(a, "active");
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try {
      await api.delete(`/agents/${a.id}`);
      load();
      toast.success("Agent deleted");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  // Clone an agent by reading its full config and creating a fresh draft copy.
  const duplicate = async (a) => {
    try {
      const { data: full } = await api.get(`/agents/${a.id}`);
      await api.post("/agents", {
        name: `${full.name} (Copy)`,
        type: full.type,
        description: full.description ?? undefined,
        model: full.model ?? undefined,
        status: "draft",
        avatar_url: full.avatar_url ?? undefined,
        system_prompt: full.system_prompt ?? undefined,
        temperature: full.temperature ?? undefined,
        voice: full.voice ?? undefined,
        language: full.language ?? undefined,
        greeting: full.greeting ?? undefined,
        max_tokens: full.max_tokens ?? undefined,
      });
      load();
      toast.success("Agent duplicated");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === "active").length;
    const paused = agents.filter((a) => a.status === "paused").length;
    const conversations = agents.reduce((sum, a) => sum + (a.conversations || 0), 0);
    const leads = agents.reduce((sum, a) => sum + (a.leads_generated || 0), 0);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return [
      { key: "total",         icon: Bot,         color: "#2563EB", label: "Total Agents",         value: total,         sub: `${active} active`,     subClass: "text-[#16A34A]" },
      { key: "active",        icon: Power,       color: "#22C55E", label: "Active Agents",        value: active,        sub: `${pct(active)}% of total`,   subClass: "text-[#64748B]" },
      { key: "paused",        icon: PauseCircle, color: "#F59E0B", label: "Paused Agents",        value: paused,        sub: `${pct(paused)}% of total`, subClass: "text-[#64748B]" },
      { key: "conversations", icon: Sparkles,    color: "#F59E0B", label: "Total Conversations",  value: conversations, sub: `${conversations} this month`, subClass: "text-[#64748B]" },
      { key: "leads",         icon: Users,       color: "#0EA5E9", label: "Total Leads Generated", value: leads,        sub: `${leads} this month`,   subClass: "text-[#64748B]" },
    ];
  }, [agents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Build"
        icon={Bot}
        title="Agents"
        subtitle="Manage, customize, and monitor your AI agents."
        actions={
          <Link
            to="/app/agents/new"
            data-testid={DASH.createAgentBtn}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white text-sm font-semibold shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] transition-opacity hover:opacity-95"
          >
            <Plus size={16} /> Create Agent
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-5 rounded-2xl bg-white border border-[#E7EAF1] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)] hover:shadow-premium hover:-translate-y-0.5 transition-all"
            data-testid={`agents-kpi-${s.key}`}
          >
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${s.color}1A` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#64748B] leading-tight">{s.label}</p>
                <p className="mt-1.5 text-[26px] font-bold tracking-tight text-[#0F172A] leading-none">
                  {s.value.toLocaleString()}
                </p>
              </div>
            </div>
            <p className={`mt-3 text-[12px] font-medium ${s.subClass}`}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Empty state or agents grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl skeleton" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState onCreate={() => nav("/app/agents/new")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((a, i) => {
            const meta = TYPE_META[a.type] || TYPE_META.chat;
            const Icon = meta.icon;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-6 rounded-2xl bg-white border border-[#E7EAF1] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)] hover:shadow-premium hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl grid place-items-center" style={{ background: `${meta.color}1A` }}>
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#0F172A] truncate">{a.name}</h3>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{meta.label}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#64748B]">{meta.desc}</p>
                {a.is_ready === false && a.status !== "archived" && (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800"
                    data-testid={`agent-incomplete-${a.id}`}
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>Incomplete — add a system prompt before deploying.</span>
                  </div>
                )}
                {/* Operational metadata */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] px-2 py-0.5 font-semibold">
                    <Cpu size={11} /> {a.model || "no model"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] text-[#475569] px-2 py-0.5 font-semibold capitalize">
                    {meta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] text-[#64748B] px-2 py-0.5">
                    <Clock size={11} /> {fmtRelative(a.updated_at)}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#64748B]">Conversations</p>
                    <p className="font-semibold text-[#0F172A]">{(a.conversations || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Success Rate</p>
                    <p className="font-semibold text-[#0F172A]">{a.success_rate || 0}%</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <Link
                    to={`/app/agents/${a.id}`}
                    className="flex-1 text-center px-3 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A]"
                    data-testid={`agent-configure-${a.id}`}
                  >
                    Open
                  </Link>
                  {a.status !== "archived" && (
                    <StatusToggle agent={a} onToggle={() => toggleStatus(a)} />
                  )}
                  <AgentMenu
                    agent={a}
                    onOpen={() => nav(`/app/agents/${a.id}`)}
                    onDuplicate={() => duplicate(a)}
                    onDeploy={() => toggleStatus(a)}
                    onDelete={() => remove(a)}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Get started footer */}
      <GetStartedCard />
    </div>
  );
}

/* ============================== Subcomponents ============================== */

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.badge}`}
      data-testid={`agent-status-${status}`}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

// Cloud-service switch: ON = Active, OFF = Paused/Draft. Disabled until the
// agent is ready (has a system prompt).
function StatusToggle({ agent, onToggle }) {
  const on = agent.status === "active";
  const blocked = !on && agent.is_ready === false;
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={on ? "Pause agent" : "Activate agent"}
      title={
        blocked
          ? "Add a system prompt before activating"
          : on
          ? "Active — click to pause"
          : "Paused — click to activate"
      }
      data-testid={`agent-toggle-${agent.id}`}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-[#22C55E]" : blocked ? "bg-[#E2E8F0] cursor-not-allowed" : "bg-[#CBD5E1]"
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// Kebab action menu: Open · Duplicate · Deploy/Pause · Delete.
function AgentMenu({ agent, onOpen, onDuplicate, onDeploy, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = agent.status === "active";
  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="size-9 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] grid place-items-center text-[#64748B]"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={`agent-menu-${agent.id}`}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-11 z-20 w-44 rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)]"
        >
          <MenuItem icon={ExternalLink} onClick={run(onOpen)}>Open</MenuItem>
          <MenuItem icon={Copy} onClick={run(onDuplicate)} testid={`agent-duplicate-${agent.id}`}>
            Duplicate
          </MenuItem>
          {agent.status !== "archived" && (
            <MenuItem
              icon={isActive ? PauseCircle : Rocket}
              onClick={run(onDeploy)}
              testid={`agent-deploy-${agent.id}`}
            >
              {isActive ? "Pause" : "Deploy"}
            </MenuItem>
          )}
          <div className="my-1 h-px bg-[#F1F5F9]" />
          <MenuItem icon={Trash2} onClick={run(onDelete)} danger testid={`agent-delete-${agent.id}`}>
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger, testid }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-testid={testid}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-[#0F172A] hover:bg-[#F8FAFC]"
      }`}
    >
      <Icon size={14} className={danger ? "text-red-500" : "text-[#64748B]"} />
      {children}
    </button>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div
      className="relative p-10 sm:p-16 rounded-3xl bg-white border-2 border-dashed border-[#CBD5E1] text-center overflow-hidden"
      data-testid="agents-empty-state"
    >
      {/* Sparkle accents */}
      <Sparkle className="absolute top-12 left-1/3 text-[#A5B4FC]" size={14} />
      <Sparkle className="absolute top-24 right-1/3 text-[#A5B4FC]" size={10} />
      <Sparkle className="absolute bottom-32 left-1/4 text-[#C4B5FD]" size={12} />
      <Sparkle className="absolute bottom-20 right-1/4 text-[#C4B5FD]" size={10} />

      {/* Cute robot mascot */}
      <div className="relative mx-auto w-40 h-40 mb-4">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(165,180,252,0) 70%)",
          }}
        />
        <RobotMascot />
      </div>

      <h3 className="text-2xl font-bold tracking-tight text-[#0F172A]">No agents yet!</h3>
      <p className="mt-2 text-[14.5px] text-[#64748B] max-w-md mx-auto leading-relaxed">
        Create your first AI agent to start automating conversations and engaging with your customers.
      </p>
      <button
        onClick={onCreate}
        className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-[0_12px_28px_-8px_rgba(37,99,235,0.55)]"
        data-testid="agents-empty-create-btn"
      >
        <Plus size={16} /> Create Your First Agent <ArrowRight size={14} />
      </button>
    </div>
  );
}

function GetStartedCard() {
  const features = [
    { icon: Zap,       title: "Easy Setup",       desc: "Create your agent in under 2 minutes" },
    { icon: Wand2,     title: "Smart Automation", desc: "Let AI handle conversations while you focus on growth" },
    { icon: LineChart, title: "Track Performance", desc: "Monitor conversations and optimize results" },
  ];
  return (
    <div className="p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF]">
      <div className="grid lg:grid-cols-[1.1fr_2fr] gap-6 items-center">
        <div className="flex items-center gap-4">
          <div
            className="size-16 rounded-2xl grid place-items-center shrink-0 shadow-[0_12px_24px_-8px_rgba(124,58,237,0.45)]"
            style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}
          >
            <Rocket size={24} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#0F172A]">Get started in minutes</p>
            <p className="mt-1 text-[12.5px] text-[#64748B] leading-snug max-w-xs">
              Create and configure your AI agent to automate calls, chats, and WhatsApp conversations.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-white grid place-items-center shrink-0 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.15)]">
                <f.icon size={16} className="text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">{f.title}</p>
                <p className="text-[11.5px] text-[#64748B] mt-0.5 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sparkle({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l1.6 7L21 12l-7.4 3L12 22l-1.6-7L3 12l7.4-3z" />
    </svg>
  );
}

function RobotMascot() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="botBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0E7FF" />
        </linearGradient>
        <linearGradient id="botFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <radialGradient id="botEye" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </radialGradient>
      </defs>
      {/* Antenna */}
      <line x1="100" y1="38" x2="100" y2="52" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="36" r="5" fill="#60A5FA" />
      {/* Head */}
      <rect x="55" y="52" width="90" height="74" rx="22" fill="url(#botBody)" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Face plate */}
      <rect x="68" y="68" width="64" height="40" rx="14" fill="url(#botFace)" />
      {/* Eyes */}
      <ellipse cx="86" cy="88" rx="6" ry="7" fill="url(#botEye)" />
      <ellipse cx="114" cy="88" rx="6" ry="7" fill="url(#botEye)" />
      {/* Eye highlights */}
      <circle cx="84" cy="85" r="1.6" fill="#FFFFFF" />
      <circle cx="112" cy="85" r="1.6" fill="#FFFFFF" />
      {/* Ear blips */}
      <rect x="50" y="78" width="6" height="20" rx="3" fill="#CBD5E1" />
      <rect x="144" y="78" width="6" height="20" rx="3" fill="#CBD5E1" />
      {/* Neck + body shadow */}
      <ellipse cx="100" cy="132" rx="40" ry="6" fill="#CBD5E1" opacity="0.6" />
      <rect x="80" y="126" width="40" height="14" rx="6" fill="url(#botBody)" stroke="#CBD5E1" strokeWidth="1.5" />
    </svg>
  );
}
