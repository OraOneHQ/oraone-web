import React, { useState } from "react";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Globe,
  Plug,
  MessagesSquare,
  Users,
  Code2,
  Workflow,
  BarChart3,
  Search,
  Sparkles,
  Plus,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  Phone,
  MessageCircle,
  Mail,
  Zap,
  Settings,
  CircleDot,
  ChevronsUpDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import DemoSwitcher from "./DemoSwitcher";

/* ──────────────────────────────────────────────────────────────────────────
   Reusable premium LIGHT dashboard shell. Mirrors the real OraOne app layout
   (sidebar groups, top bar, KPI grid, charts, conversations, top agents) and
   is fully driven by a `theme` object so each demo expresses a distinct light
   personality while keeping structure identical for fair comparison.
   ────────────────────────────────────────────────────────────────────────── */

const NAV = [
  { section: null, items: [{ icon: LayoutDashboard, label: "Dashboard", active: true }] },
  {
    section: "Build",
    items: [
      { icon: Bot, label: "AI Agents" },
      { icon: BookOpen, label: "Knowledge Base" },
      { icon: Globe, label: "Websites" },
      { icon: Plug, label: "Integrations" },
    ],
  },
  {
    section: "Operate",
    items: [
      { icon: MessagesSquare, label: "Conversations" },
      { icon: Users, label: "Leads" },
      { icon: Code2, label: "Channels & Widgets" },
      { icon: Workflow, label: "Workflows" },
    ],
  },
  { section: "Insights", items: [{ icon: BarChart3, label: "Analytics" }] },
  {
    section: "Tools",
    items: [
      { icon: Search, label: "Ask Knowledge" },
      { icon: Sparkles, label: "Chat" },
    ],
  },
];

const SERIES = [
  { d: "Jun 1", messages: 420, conversations: 60 },
  { d: "Jun 3", messages: 510, conversations: 72 },
  { d: "Jun 5", messages: 480, conversations: 66 },
  { d: "Jun 7", messages: 640, conversations: 88 },
  { d: "Jun 9", messages: 590, conversations: 80 },
  { d: "Jun 11", messages: 720, conversations: 96 },
  { d: "Jun 13", messages: 690, conversations: 92 },
  { d: "Jun 15", messages: 880, conversations: 118 },
  { d: "Jun 17", messages: 820, conversations: 110 },
  { d: "Jun 19", messages: 970, conversations: 132 },
  { d: "Jun 21", messages: 1040, conversations: 142 },
  { d: "Jun 23", messages: 1180, conversations: 158 },
];

const KPIS = [
  { label: "Conversations · 30d", value: "1,284", delta: "+12.4%", up: true, icon: MessagesSquare },
  { label: "Active Agents", value: "8", delta: "+2", up: true, icon: Bot },
  { label: "Leads Captured", value: "342", delta: "+9.1%", up: true, icon: Users },
  { label: "Messages · 30d", value: "18.6k", delta: "+18%", up: true, icon: Zap },
  { label: "Tokens Used", value: "2.4M", delta: "+6.2%", up: true, icon: CircleDot },
  { label: "Est. Cost · 30d", value: "$128.40", delta: "-3.1%", up: false, icon: TrendingUp },
];

const CHANNELS = [
  { name: "Web Chat", value: 48 },
  { name: "WhatsApp", value: 27 },
  { name: "Voice", value: 17 },
  { name: "Email", value: 8 },
];

const CONVERSATIONS = [
  { name: "Priya Sharma", q: "Pricing for the Pro plan?", channel: "Web", icon: MessageCircle, agent: "Sales Assistant", status: "Resolved", time: "2m" },
  { name: "Daniel Cole", q: "Where is my order #48213?", channel: "WhatsApp", icon: MessageCircle, agent: "Support Bot", status: "Active", time: "6m" },
  { name: "Aisha Khan", q: "Can I book a demo call?", channel: "Voice", icon: Phone, agent: "Voice Concierge", status: "Booked", time: "14m" },
  { name: "Marco Rossi", q: "Refund policy details", channel: "Email", icon: Mail, agent: "Support Bot", status: "Pending", time: "22m" },
  { name: "Lena Vogt", q: "Does it integrate with HubSpot?", channel: "Web", icon: MessageCircle, agent: "Sales Assistant", status: "Resolved", time: "31m" },
];

const TOP_AGENTS = [
  { name: "Sales Assistant", convos: 512, pct: 92 },
  { name: "Support Bot", convos: 438, pct: 78 },
  { name: "Voice Concierge", convos: 221, pct: 54 },
  { name: "Onboarding Guide", convos: 113, pct: 31 },
];

const soft = (hex, alpha = "1A") => `${hex}${alpha}`;

function Delta({ up, children, r }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        color: up ? "#067647" : "#B42318",
        background: up ? "#ECFDF3" : "#FEF3F2",
        borderRadius: r,
      }}
    >
      <ArrowUpRight size={11} style={{ transform: up ? "none" : "rotate(90deg)" }} />
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, label, ink }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#EAECF2] bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold" style={{ color: ink }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[11px]" style={{ color: p.color }}>
          {p.dataKey}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardShell({ theme: t }) {
  const [hovered, setHovered] = useState(null);

  const card = {
    borderRadius: t.cardRadius,
    border: `1px solid ${t.line}`,
    background: t.cardBg,
    boxShadow: t.shadow,
  };
  const chMap = { Web: t.channels[0], WhatsApp: t.channels[1], Voice: t.channels[2], Email: t.channels[3] };
  const statusMap = {
    Resolved: "#16A34A",
    Active: t.brand,
    Booked: "#7C3AED",
    Pending: "#B45309",
  };
  const gradient = `linear-gradient(135deg, ${t.brand}, ${t.brand2})`;

  return (
    <div className="min-h-screen w-full font-sans antialiased" style={{ background: t.canvas, color: t.ink }}>
      <DemoSwitcher />

      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* ===================== SIDEBAR ===================== */}
        <aside
          className="sticky top-0 hidden h-screen w-[252px] flex-shrink-0 flex-col lg:flex"
          style={{ background: t.sidebarBg, borderRight: `1px solid ${t.line}` }}
        >
          <div className="flex h-16 items-center px-5" style={{ borderBottom: `1px solid ${t.line}` }}>
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-9 place-items-center rounded-xl text-white"
                style={{ background: gradient, boxShadow: `0 6px 16px -6px ${soft(t.brand, "B3")}` }}
              >
                <Sparkles size={18} />
              </span>
              <span className="text-[17px] font-extrabold tracking-tight" style={{ color: t.ink }}>
                OraOne
              </span>
            </div>
          </div>

          {/* project switcher */}
          <button
            className="mx-3 mt-3 flex items-center justify-between px-3 py-2.5 text-left transition-colors"
            style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: soft(t.brand, "08") }}
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: gradient }}>
                AC
              </span>
              <span>
                <span className="block text-[13px] font-bold leading-tight" style={{ color: t.ink }}>
                  Acme Inc
                </span>
                <span className="block text-[11px]" style={{ color: t.muted }}>
                  Production
                </span>
              </span>
            </span>
            <ChevronsUpDown size={15} color={t.muted} />
          </button>

          {/* create CTA */}
          <button
            className="mx-3 mt-3 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style={{ background: gradient, borderRadius: t.ctrlRadius, boxShadow: `0 8px 20px -8px ${soft(t.brand, "B3")}` }}
          >
            <Plus size={17} /> Create AI Agent
          </button>

          <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
            {NAV.map((group, gi) => (
              <div key={gi} className={group.section ? "pt-4" : ""}>
                {group.section && (
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
                    {group.section}
                  </p>
                )}
                {group.items.map((it) => (
                  <a
                    key={it.label}
                    href="#"
                    className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
                    style={
                      it.active
                        ? { background: t.accentBg, color: t.brand, borderRadius: t.ctrlRadius }
                        : { color: t.sub, borderRadius: t.ctrlRadius }
                    }
                    onMouseEnter={(e) => {
                      if (!it.active) e.currentTarget.style.background = soft(t.brand, "0A");
                    }}
                    onMouseLeave={(e) => {
                      if (!it.active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <it.icon size={18} className={it.active ? "" : "opacity-80"} />
                    {it.label}
                    {it.active && <span className="ml-auto size-1.5 rounded-full" style={{ background: t.brand }} />}
                  </a>
                ))}
              </div>
            ))}
          </nav>

          {/* upgrade card */}
          <div
            className="mx-3 mb-4 p-4"
            style={{ borderRadius: t.cardRadius, border: `1px solid ${t.line}`, background: t.accentBg }}
          >
            <p className="text-[13px] font-bold" style={{ color: t.ink }}>
              You're on Starter
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: t.sub }}>
              Unlock voice agents & unlimited seats.
            </p>
            <button
              className="mt-3 flex w-full items-center justify-center gap-1 px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: t.ink, borderRadius: t.ctrlRadius }}
            >
              Upgrade <ArrowRight size={14} />
            </button>
          </div>
        </aside>

        {/* ===================== MAIN ===================== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header
            className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 px-4 backdrop-blur-md sm:px-6"
            style={{ background: `${t.cardBg}D9`, borderBottom: `1px solid ${t.line}` }}
          >
            <div className="hidden flex-1 lg:block">
              <div
                className="flex max-w-md items-center gap-2 px-3 py-2 text-sm"
                style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: soft(t.brand, "06") }}
              >
                <Search size={16} color={t.muted} />
                <span style={{ color: t.muted }}>Search agents, conversations, docs…</span>
                <span
                  className="ml-auto px-1.5 py-0.5 text-[11px] font-medium"
                  style={{ borderRadius: 6, border: `1px solid ${t.line}`, background: t.cardBg, color: t.muted }}
                >
                  ⌘K
                </span>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2.5 lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: gradient }}>
                <Sparkles size={18} />
              </span>
              <span className="text-[16px] font-extrabold tracking-tight" style={{ color: t.ink }}>
                OraOne
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="relative grid size-9 place-items-center transition-colors"
                style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: t.cardBg, color: t.sub }}
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#F04438] ring-2 ring-white" />
              </button>
              <button
                className="grid size-9 place-items-center transition-colors"
                style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: t.cardBg, color: t.sub }}
              >
                <Settings size={17} />
              </button>
              <button
                className="flex items-center gap-2 py-1 pl-1 pr-2 transition-colors"
                style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: t.cardBg }}
              >
                <span className="grid size-7 place-items-center rounded-lg text-[12px] font-bold text-white" style={{ background: gradient }}>
                  JD
                </span>
                <ChevronDown size={15} color={t.muted} />
              </button>
            </div>
          </header>

          {/* content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1240px] space-y-7 p-4 sm:p-6 lg:p-8">
              {/* greeting */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.brand }}>
                    <span className="size-2.5 rounded-full" style={{ background: t.brand }} />
                    Good morning · Acme Inc
                  </p>
                  <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]" style={{ color: t.ink }}>
                    Everything happening across your project.
                  </h1>
                  <p className="mt-1.5 text-sm" style={{ color: t.sub }}>
                    Live metrics, recent activity and usage — updated in real time.
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
                  style={{ background: gradient, borderRadius: t.ctrlRadius, boxShadow: `0 10px 24px -10px ${soft(t.brand, "B3")}` }}
                >
                  <Plus size={16} /> New Agent
                </button>
              </div>

              {/* guided banner */}
              <div
                className="group flex flex-wrap items-center justify-between gap-4 overflow-hidden p-5"
                style={{ borderRadius: t.cardRadius, border: `1px solid ${t.line}`, background: t.bannerBg }}
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl text-white shadow-sm" style={{ background: gradient }}>
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: t.ink }}>
                      Build your AI in 5 guided steps
                    </p>
                    <p className="text-[13px]" style={{ color: t.sub }}>
                      Goal → knowledge → model → customize → deploy. We wire everything for you.
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: t.brand, borderRadius: t.ctrlRadius }}
                >
                  Start guided setup <ArrowRight size={15} />
                </button>
              </div>

              {/* KPI grid */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: t.ink }}>
                    Live Metrics
                  </h2>
                  <span className="text-[12px]" style={{ color: t.muted }}>
                    · last 30 days
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {KPIS.map((k, i) => {
                    const tone = t.kpi[i];
                    return (
                      <div key={k.label} className="group p-4 transition-all hover:-translate-y-0.5" style={card}>
                        <div className="flex items-center justify-between">
                          <span className="grid size-9 place-items-center rounded-xl" style={{ background: tone.bg }}>
                            <k.icon size={16} style={{ color: tone.tone }} />
                          </span>
                          <Delta up={k.up} r={t.ctrlRadius}>
                            {k.delta}
                          </Delta>
                        </div>
                        <p className="mt-3 text-[24px] font-extrabold tracking-tight" style={{ color: t.ink }}>
                          {k.value}
                        </p>
                        <p className="mt-0.5 text-[12px]" style={{ color: t.sub }}>
                          {k.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* charts */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="p-5 lg:col-span-2" style={card}>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: t.ink }}>
                        Activity over time
                      </h3>
                      <p className="text-[13px]" style={{ color: t.sub }}>
                        Messages & conversations
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]" style={{ color: t.sub }}>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: t.chart1 }} /> Messages
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: t.chart2 }} /> Conversations
                      </span>
                    </div>
                  </div>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={SERIES} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`g1${t.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={t.chart1} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={t.chart1} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`g2${t.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={t.chart2} stopOpacity={0.24} />
                            <stop offset="100%" stopColor={t.chart2} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={soft(t.muted, "33")} vertical={false} />
                        <XAxis dataKey="d" tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip ink={t.ink} />} />
                        <Area type="monotone" dataKey="messages" stroke={t.chart1} strokeWidth={2.5} fill={`url(#g1${t.id})`} />
                        <Area type="monotone" dataKey="conversations" stroke={t.chart2} strokeWidth={2.5} fill={`url(#g2${t.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* donut */}
                <div className="p-5" style={card}>
                  <h3 className="text-[15px] font-bold" style={{ color: t.ink }}>
                    Channels
                  </h3>
                  <p className="text-[13px]" style={{ color: t.sub }}>
                    Conversations by source
                  </p>
                  <div className="relative mx-auto mt-2 h-[168px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={CHANNELS}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                          stroke="none"
                          onMouseEnter={(_, i) => setHovered(i)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          {CHANNELS.map((c, i) => (
                            <Cell key={c.name} fill={t.channels[i]} opacity={hovered === null || hovered === i ? 1 : 0.4} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[22px] font-extrabold" style={{ color: t.ink }}>
                        1,284
                      </span>
                      <span className="text-[11px]" style={{ color: t.muted }}>
                        total
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {CHANNELS.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2" style={{ color: t.sub }}>
                          <span className="size-2.5 rounded-full" style={{ background: t.channels[i] }} />
                          {c.name}
                        </span>
                        <span className="font-semibold" style={{ color: t.ink }}>
                          {c.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* conversations + agents */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="overflow-hidden lg:col-span-2" style={card}>
                  <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.line}` }}>
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: t.ink }}>
                        Recent conversations
                      </h3>
                      <p className="text-[13px]" style={{ color: t.sub }}>
                        Across every channel
                      </p>
                    </div>
                    <button className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: t.brand }}>
                      View all <ChevronDown size={14} className="-rotate-90" />
                    </button>
                  </div>
                  <div>
                    {CONVERSATIONS.map((c, i) => {
                      const cc = chMap[c.channel];
                      const sc = statusMap[c.status];
                      return (
                        <div
                          key={c.name}
                          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.015]"
                          style={i ? { borderTop: `1px solid ${soft(t.line, "AA")}` } : undefined}
                        >
                          <span className="grid size-9 flex-shrink-0 place-items-center rounded-xl" style={{ background: soft(cc, "1A") }}>
                            <c.icon size={16} style={{ color: cc }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[14px] font-semibold" style={{ color: t.ink }}>
                                {c.name}
                              </p>
                              <span className="text-[11px]" style={{ color: t.muted }}>
                                {c.channel}
                              </span>
                            </div>
                            <p className="truncate text-[13px]" style={{ color: t.sub }}>
                              {c.q}
                            </p>
                          </div>
                          <div className="hidden text-right sm:block">
                            <p className="text-[12px] font-medium" style={{ color: t.sub }}>
                              {c.agent}
                            </p>
                            <p className="text-[11px]" style={{ color: t.muted }}>
                              {c.time} ago
                            </p>
                          </div>
                          <span
                            className="flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold"
                            style={{ background: soft(sc, "1A"), color: sc, borderRadius: t.ctrlRadius }}
                          >
                            {c.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* top agents */}
                <div className="p-5" style={card}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: t.ink }}>
                        Top agents
                      </h3>
                      <p className="text-[13px]" style={{ color: t.sub }}>
                        By conversations
                      </p>
                    </div>
                    <span className="grid size-8 place-items-center rounded-lg" style={{ background: t.accentBg }}>
                      <Bot size={15} color={t.brand} />
                    </span>
                  </div>
                  <div className="space-y-4">
                    {TOP_AGENTS.map((a, i) => (
                      <div key={a.name}>
                        <div className="mb-1.5 flex items-center justify-between text-[13px]">
                          <span className="font-semibold" style={{ color: t.ink }}>
                            {a.name}
                          </span>
                          <span style={{ color: t.sub }}>{a.convos}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: soft(t.muted, "26") }}>
                          <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: t.channels[i] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-5 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors"
                    style={{ borderRadius: t.ctrlRadius, border: `1px solid ${t.line}`, background: t.cardBg, color: t.ink }}
                  >
                    Manage agents <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="pb-6 text-center text-[12px]" style={{ color: t.muted }}>
                {t.name} — premium light theme · demo data
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
