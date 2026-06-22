import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Phone,
  MessageSquare,
  MessageCircle,
  Bot,
  Pause,
  Play,
  Trash2,
  Sparkles,
  Users,
  Rocket,
  Zap,
  Wand2,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { DASH } from "@/constants/testIds";

const TYPE_META = {
  voice:    { icon: Phone,         color: "#2563EB", label: "Voice Agent",    desc: "Answers calls and talks like a human." },
  chat:     { icon: MessageSquare, color: "#7C3AED", label: "Chat Agent",     desc: "Chats on your website and engages visitors." },
  whatsapp: { icon: MessageCircle, color: "#22C55E", label: "WhatsApp Agent", desc: "AI that replies on WhatsApp." },
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

  const toggleStatus = async (a) => {
    const newStatus = a.status === "active" ? "paused" : "active";
    try {
      // Phase 6: partial-update PUT — only send the changed field
      await api.put(`/agents/${a.id}`, { status: newStatus });
      load();
      toast.success(`Agent ${newStatus}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
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

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === "active").length;
    const inactive = total - active;
    const conversations = agents.reduce((sum, a) => sum + (a.conversations || 0), 0);
    const leads = agents.reduce((sum, a) => sum + (a.leads_generated || 0), 0);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return [
      { key: "total",         icon: Bot,       color: "#2563EB", label: "Total Agents",         value: total,         sub: `${active} active`,     subClass: "text-[#16A34A]" },
      { key: "active",        icon: Play,      color: "#22C55E", label: "Active Agents",        value: active,        sub: `${pct(active)}% of total`,   subClass: "text-[#64748B]" },
      { key: "inactive",      icon: Pause,     color: "#7C3AED", label: "Inactive Agents",      value: inactive,      sub: `${pct(inactive)}% of total`, subClass: "text-[#64748B]" },
      { key: "conversations", icon: Sparkles,  color: "#F59E0B", label: "Total Conversations",  value: conversations, sub: `${conversations} this month`, subClass: "text-[#64748B]" },
      { key: "leads",         icon: Users,     color: "#0EA5E9", label: "Total Leads Generated", value: leads,        sub: `${leads} this month`,   subClass: "text-[#64748B]" },
    ];
  }, [agents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Agents</h2>
          <p className="text-sm text-[#64748B] mt-1">Manage, customize, and monitor your AI agents.</p>
        </div>
        <Link
          to="/app/agents/new"
          data-testid={DASH.createAgentBtn}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)]"
        >
          <Plus size={16} /> Create Agent
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:shadow-premium hover:-translate-y-0.5 transition-all"
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
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] hover:shadow-premium transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl grid place-items-center" style={{ background: `${meta.color}1A` }}>
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#0F172A] truncate">{a.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          a.status === "active" ? "bg-green-50 text-green-700" : "bg-[#F1F5F9] text-[#64748B]"
                        }`}
                      >
                        {a.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{meta.label}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#64748B]">{meta.desc}</p>
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
                    Configure
                  </Link>
                  <button
                    onClick={() => toggleStatus(a)}
                    className="size-9 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] grid place-items-center text-[#475569]"
                    aria-label="Toggle status"
                    data-testid={`agent-toggle-${a.id}`}
                  >
                    {a.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => remove(a)}
                    className="size-9 rounded-xl border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 grid place-items-center text-red-500"
                    aria-label="Delete"
                    data-testid={`agent-delete-${a.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
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
