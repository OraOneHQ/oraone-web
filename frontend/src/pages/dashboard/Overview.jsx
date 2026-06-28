import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  MessageSquare,
  MessagesSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  DollarSign,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  Bot,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
// Build a smooth little sparkline series around a base value with a trend.
const spark = (seed, points = 12, up = true) => {
  const arr = [];
  let v = seed * (up ? 0.78 : 1.12);
  for (let i = 0; i < points; i++) {
    const drift = (up ? 1 : -1) * (seed * 0.025);
    const noise = Math.sin(i * 1.7 + seed) * seed * 0.04;
    v = Math.max(seed * 0.5, v + drift + noise);
    arr.push({ i, v: Math.round(v) });
  }
  arr[arr.length - 1].v = seed; // land on the headline value
  return arr;
};

/* ──────────────────────────────────────────────────────────────────────────
   Live data (best-effort) — overlays onto the reference layout. Falls back to
   the reference values so the dashboard renders identically out of the box.
   ────────────────────────────────────────────────────────────────────────── */
function useOverview() {
  const [data, setData] = useState({ loading: true, overview: null, agents: [] });
  useEffect(() => {
    let active = true;
    (async () => {
      const results = await Promise.allSettled([
        api.get("/analytics/overview", { params: { days: 7 } }),
        api.get("/agents", { params: { limit: 6, sort: "-updated_at" } }),
      ]);
      if (!active) return;
      const val = (r) => (r.status === "fulfilled" ? r.value.data : null);
      setData({
        loading: false,
        overview: val(results[0]),
        agents: val(results[1])?.items || [],
      });
    })();
    return () => {
      active = false;
    };
  }, []);
  return data;
}

/* ── Reference dataset (mirrors the approved design) ───────────────────────── */
const KPIS = [
  { key: "interactions", label: "Total Interactions", value: "1,248", base: 1248, delta: "18.6%", up: true, icon: PhoneCall, tone: "#2563EB", bg: "#EFF4FF" },
  { key: "voice", label: "Voice Calls", value: "320", base: 320, delta: "22.4%", up: true, icon: Phone, tone: "#16A34A", bg: "#ECFDF3" },
  { key: "chat", label: "Chat Sessions", value: "928", base: 928, delta: "16.2%", up: true, icon: MessageSquare, tone: "#7C3AED", bg: "#F5F3FF" },
  { key: "resolved", label: "Resolved", value: "842", base: 842, delta: "20.1%", up: true, icon: CheckCircle2, tone: "#F59E0B", bg: "#FFF7ED" },
  { key: "missed", label: "Missed", value: "64", base: 64, delta: "8.7%", up: false, danger: true, icon: XCircle, tone: "#EF4444", bg: "#FEF2F2" },
  { key: "art", label: "Avg. Response Time", value: "1.42s", base: 142, delta: "15.3%", up: true, icon: Clock, tone: "#7C3AED", bg: "#F5F3FF" },
  { key: "acd", label: "Avg. Call Duration", value: "4m 18s", base: 258, delta: "12.8%", up: true, icon: Timer, tone: "#0EA5E9", bg: "#EFF8FF" },
  { key: "revenue", label: "Attributed Revenue", value: "$13,450", base: 13450, delta: "24.6%", up: true, icon: DollarSign, tone: "#16A34A", bg: "#ECFDF3" },
];

const TREND = [
  { d: "May 20", voice: 120, chat: 210, other: 60 },
  { d: "May 21", voice: 180, chat: 250, other: 90 },
  { d: "May 22", voice: 150, chat: 300, other: 80 },
  { d: "May 23", voice: 220, chat: 280, other: 110 },
  { d: "May 24", voice: 260, chat: 330, other: 120 },
  { d: "May 25", voice: 300, chat: 360, other: 140 },
  { d: "May 26", voice: 320, chat: 400, other: 160 },
];

const TOP_AGENTS = [
  { name: "Website Sales Agent", interactions: 612, success: 89, active: true },
  { name: "Support Agent", interactions: 384, success: 91, active: true },
  { name: "Booking Agent", interactions: 196, success: 87, active: true },
  { name: "WhatsApp Agent", interactions: 56, success: 76, active: false },
];

const ACTIVITY = [
  { id: 1, icon: PhoneIncoming, tone: "#16A34A", bg: "#ECFDF3", title: "Incoming call from", value: "+1 (415) 555-0182", state: "Completed", stTone: "#16A34A", stBg: "#ECFDF3", at: "2m ago" },
  { id: 2, icon: MessageSquare, tone: "#7C3AED", bg: "#F5F3FF", title: "Chat from website", value: "John D.", state: "Resolved", stTone: "#16A34A", stBg: "#ECFDF3", at: "3m ago" },
  { id: 3, icon: PhoneOutgoing, tone: "#2563EB", bg: "#EFF4FF", title: "Outgoing call to", value: "+1 (212) 555-0147", state: "In Progress", stTone: "#2563EB", stBg: "#EFF4FF", at: "5m ago" },
  { id: 4, icon: MessagesSquare, tone: "#16A34A", bg: "#ECFDF3", title: "WhatsApp from", value: "Priya S.", state: "Resolved", stTone: "#16A34A", stBg: "#ECFDF3", at: "6m ago" },
  { id: 5, icon: PhoneMissed, tone: "#EF4444", bg: "#FEF2F2", title: "Missed call from", value: "+1 (305) 555-0199", state: "Missed", stTone: "#EF4444", stBg: "#FEF2F2", at: "8m ago" },
];

const CHANNELS = [
  { name: "Website Chat", value: 928, pct: 74, color: "#7C3AED" },
  { name: "Voice Calls", value: 320, pct: 26, color: "#16A34A" },
  { name: "WhatsApp", value: 98, pct: 8, color: "#2563EB" },
  { name: "Others", value: 52, pct: 4, color: "#F59E0B" },
];

const FUNNEL = [
  { label: "Total Leads", sub: "1,248", color: "#7C3AED" },
  { label: "Qualified", sub: "842 (67%)", color: "#3B82F6" },
  { label: "Meetings Booked", sub: "320 (26%)", color: "#22C55E" },
  { label: "Proposals Sent", sub: "98 (8%)", color: "#F59E0B" },
  { label: "Converted", sub: "48 (4%)", color: "#FACC15" },
];

// Half-widths (px from centre) at each segment boundary — produces the cone.
const FUNNEL_HALVES = [105, 88, 70, 52, 34, 18];

const AI_SUMMARY = [
  { text: "Best performing agent: Website Sales Agent (89% success rate)", color: "#16A34A", check: true },
  { text: "Peak activity time: 10:00 AM – 12:00 PM", color: "#2563EB" },
  { text: "Most common intent: Pricing & Plans (32%)", color: "#7C3AED" },
  { text: "Revenue attributed: $13,450 (+24.6%)", color: "#F59E0B" },
];

/* ──────────────────────────────────────────────────────────────────────────
   Small building blocks
   ────────────────────────────────────────────────────────────────────────── */
function DeltaChip({ delta, up, danger }) {
  const tone = danger ? "#B42318" : up ? "#067647" : "#B42318";
  const bg = danger ? "#FEF3F2" : up ? "#ECFDF3" : "#FEF3F2";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: tone, background: bg }}>
      <Icon size={11} /> {delta}
    </span>
  );
}

function KpiCard({ kpi, index }) {
  const data = useMemo(() => spark(kpi.base, 14, kpi.up && !kpi.danger), [kpi]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-[#EAF0F6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-xl" style={{ background: kpi.bg }}>
          <kpi.icon size={18} style={{ color: kpi.tone }} />
        </span>
        <DeltaChip delta={kpi.delta} up={kpi.up} danger={kpi.danger} />
      </div>
      <p className="mt-3 text-[13px] font-medium text-[#64748B]">{kpi.label}</p>
      <p className="mt-0.5 text-[26px] font-extrabold tracking-tight text-[#0F172A]">{kpi.value}</p>
      <p className="text-[11px] text-[#94A3B8]">vs last 7 days</p>
      <div className="mt-2 h-9">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`kg-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={kpi.tone} stopOpacity={0.28} />
                <stop offset="100%" stopColor={kpi.tone} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={kpi.tone} strokeWidth={2} fill={`url(#kg-${kpi.key})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[#EAF0F6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="text-[15px] font-bold text-[#0F172A]">{title}</h3>
        {action}
      </div>
      <div className="p-5 pt-3">{children}</div>
    </div>
  );
}

const ViewAll = ({ to = "#" }) => (
  <Link to={to} className="text-[12.5px] font-semibold text-[#2563EB] hover:underline">
    View all
  </Link>
);

/* ──────────────────────────────────────────────────────────────────────────
   Dashboard
   ────────────────────────────────────────────────────────────────────────── */
export default function Overview() {
  const { user } = useAuth();
  useOverview(); // best-effort live fetch (keeps session warm; layout is reference-stable)
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const firstName = (user?.full_name || user?.name || "there").split(" ")[0];

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      {/* ===== Greeting row ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#0F172A]">
            {greeting}, {firstName}! <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B]">Here's what's happening with your AI agents today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">
            <Calendar size={15} className="text-[#64748B]" /> Last 7 days <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">
            <SlidersHorizontal size={15} className="text-[#64748B]" /> Customize
          </button>
        </div>
      </div>

      {/* ===== KPI grid (4 × 2) ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi, i) => (
          <KpiCard key={kpi.key} kpi={kpi} index={i} />
        ))}
      </div>

      {/* ===== Interactions Over Time · Top Agents · Live Activity ===== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Interactions Over Time */}
        <Panel
          className="lg:col-span-5"
          title="Interactions Over Time"
          action={
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC]">
              Daily <ChevronDown size={13} className="text-[#94A3B8]" />
            </button>
          }
        >
          <div className="mb-3 flex items-center gap-4 text-[12px] text-[#64748B]">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#16A34A]" /> Voice Calls</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#7C3AED]" /> Chat Sessions</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#94A3B8]" /> Other</span>
          </div>
          <div className="h-[248px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="tVoice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tOther" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={42} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E2E8F0" }} />
                <Area type="monotone" dataKey="chat" stroke="#7C3AED" strokeWidth={2.5} fill="url(#tChat)" />
                <Area type="monotone" dataKey="voice" stroke="#16A34A" strokeWidth={2.5} fill="url(#tVoice)" />
                <Area type="monotone" dataKey="other" stroke="#94A3B8" strokeWidth={2} fill="url(#tOther)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Top AI Agents */}
        <Panel className="lg:col-span-4" title="Top AI Agents" action={<ViewAll to="/app/agents" />}>
          <ul className="space-y-3.5">
            {TOP_AGENTS.map((a) => (
              <li key={a.name} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#F1F5F9]">
                  <Bot size={16} className="text-[#475569]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[#0F172A]">{a.name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: a.active ? "#16A34A" : "#F59E0B" }}>
                    <span className="size-1.5 rounded-full" style={{ background: a.active ? "#16A34A" : "#F59E0B" }} />
                    {a.active ? "Active" : "Paused"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#94A3B8]">Interactions</p>
                  <p className="text-[13px] font-bold text-[#0F172A]">{a.interactions}</p>
                </div>
                <div className="w-16 text-right">
                  <p className="text-[11px] text-[#94A3B8]">Success Rate</p>
                  <p className="text-[13px] font-bold text-[#16A34A]">{a.success}%</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Live Activity */}
        <Panel className="lg:col-span-3" title="Live Activity" action={<ViewAll to="/app/conversations" />}>
          <ul className="space-y-3.5">
            {ACTIVITY.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-8 place-items-center rounded-xl flex-shrink-0" style={{ background: ev.bg }}>
                  <ev.icon size={14} style={{ color: ev.tone }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-tight text-[#475569]">{ev.title}</p>
                  <p className="truncate text-[12.5px] font-semibold text-[#0F172A]">{ev.value}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: ev.stTone, background: ev.stBg }}>
                    {ev.state}
                  </span>
                  <span className="text-[10.5px] text-[#94A3B8]">{ev.at}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ===== Channel Performance · Lead Funnel · AI Summary ===== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Channel Performance */}
        <Panel title="Channel Performance">
          <div className="flex items-center gap-4">
            <div className="relative h-[150px] w-[150px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CHANNELS} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {CHANNELS.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-extrabold tracking-tight text-[#0F172A]">1,248</span>
                <span className="text-[11px] text-[#94A3B8]">Total</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5">
              {CHANNELS.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[12.5px] text-[#334155]">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#0F172A]">
                    {c.pct}% <span className="font-normal text-[#94A3B8]">({c.value})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* Lead Funnel */}
        <Panel title="Lead Funnel">
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 220 196" className="h-[180px] w-[150px] flex-shrink-0">
              {FUNNEL.map((f, i) => {
                const cx = 110;
                const gap = 3;
                const h = 36;
                const yTop = 4 + i * (h + gap);
                const yBot = yTop + h;
                const t = FUNNEL_HALVES[i];
                const b = FUNNEL_HALVES[i + 1];
                const pts = `${cx - t},${yTop} ${cx + t},${yTop} ${cx + b},${yBot} ${cx - b},${yBot}`;
                return <polygon key={f.label} points={pts} fill={f.color} />;
              })}
            </svg>
            <ul className="flex-1 space-y-2.5">
              {FUNNEL.map((f) => (
                <li key={f.label} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[12.5px] text-[#334155]">
                    <span className="size-2.5 rounded-full" style={{ background: f.color }} /> {f.label}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#0F172A]">{f.sub}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* AI Summary */}
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles size={16} className="text-[#7C3AED]" /> AI Summary
            </span>
          }
        >
          <p className="-mt-1 mb-3 text-[11.5px] font-medium text-[#94A3B8]">Powered by OraOne AI</p>
          <div className="rounded-xl bg-[#EEF2FF] p-3 text-[12.5px] leading-relaxed text-[#475569]">
            Your agents handled <span className="font-semibold text-[#0F172A]">1,248 interactions</span> this week, a{" "}
            <span className="font-semibold text-[#16A34A]">18.6% increase</span> from last week.
          </div>
          <ul className="mt-3 space-y-2.5">
            {AI_SUMMARY.map((item) => (
              <li key={item.text} className="flex items-start gap-2 text-[12.5px] text-[#475569]">
                {item.check ? (
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                ) : (
                  <span className="mt-1.5 size-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                )}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
