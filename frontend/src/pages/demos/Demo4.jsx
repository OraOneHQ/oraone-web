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
   DESIGN DIRECTION 4 — "Luminous" — best-in-class LIGHT dashboard theme.
   Mirrors the real OraOne app (sidebar groups, top bar, KPI grid, charts,
   recent conversations, top agents) but elevated: airy canvas, crisp cards,
   refined shadows, a signature indigo→sky accent, and confident typography.
   Self-contained — static demo data, no global theme changes.
   ────────────────────────────────────────────────────────────────────────── */

const INK = "#0B1220";
const SUB = "#667085";
const MUTED = "#98A2B3";
const LINE = "#EAECF2";
const CANVAS = "#F6F8FC";
const BRAND = "#2563EB";
const BRAND2 = "#4F46E5";

const CARD =
  "rounded-2xl border border-[#EAECF2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)]";

/* ── Sidebar config (mirrors real app nav) ─────────────────────────────── */
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
  {
    section: "Insights",
    items: [{ icon: BarChart3, label: "Analytics" }],
  },
  {
    section: "Tools",
    items: [
      { icon: Search, label: "Ask Knowledge" },
      { icon: Sparkles, label: "Chat" },
    ],
  },
];

/* ── Demo data ─────────────────────────────────────────────────────────── */
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

const CHANNELS = [
  { name: "Web Chat", value: 48, color: "#2563EB" },
  { name: "WhatsApp", value: 27, color: "#16A34A" },
  { name: "Voice", value: 17, color: "#7C3AED" },
  { name: "Email", value: 8, color: "#F59E0B" },
];

const KPIS = [
  { label: "Conversations · 30d", value: "1,284", delta: "+12.4%", up: true, icon: MessagesSquare, tone: "#2563EB", bg: "#EFF6FF" },
  { label: "Active Agents", value: "8", delta: "+2", up: true, icon: Bot, tone: "#7C3AED", bg: "#F5F3FF" },
  { label: "Leads Captured", value: "342", delta: "+9.1%", up: true, icon: Users, tone: "#16A34A", bg: "#ECFDF3" },
  { label: "Messages · 30d", value: "18.6k", delta: "+18%", up: true, icon: Zap, tone: "#0EA5E9", bg: "#EFF8FF" },
  { label: "Tokens Used", value: "2.4M", delta: "+6.2%", up: true, icon: CircleDot, tone: "#F59E0B", bg: "#FEFBEB" },
  { label: "Est. Cost · 30d", value: "$128.40", delta: "-3.1%", up: false, icon: TrendingUp, tone: "#DC2626", bg: "#FEF3F2" },
];

const CONVERSATIONS = [
  { name: "Priya Sharma", q: "Pricing for the Pro plan?", channel: "Web", icon: MessageCircle, agent: "Sales Assistant", status: "Resolved", tone: "#16A34A", bg: "#ECFDF3", time: "2m" },
  { name: "Daniel Cole", q: "Where is my order #48213?", channel: "WhatsApp", icon: MessageCircle, agent: "Support Bot", status: "Active", tone: "#2563EB", bg: "#EFF6FF", time: "6m" },
  { name: "Aisha Khan", q: "Can I book a demo call?", channel: "Voice", icon: Phone, agent: "Voice Concierge", status: "Booked", tone: "#7C3AED", bg: "#F5F3FF", time: "14m" },
  { name: "Marco Rossi", q: "Refund policy details", channel: "Email", icon: Mail, agent: "Support Bot", status: "Pending", tone: "#B45309", bg: "#FEFBEB", time: "22m" },
  { name: "Lena Vogt", q: "Does it integrate with HubSpot?", channel: "Web", icon: MessageCircle, agent: "Sales Assistant", status: "Resolved", tone: "#16A34A", bg: "#ECFDF3", time: "31m" },
];

const TOP_AGENTS = [
  { name: "Sales Assistant", convos: 512, pct: 92, color: "#2563EB" },
  { name: "Support Bot", convos: 438, pct: 78, color: "#16A34A" },
  { name: "Voice Concierge", convos: 221, pct: 54, color: "#7C3AED" },
  { name: "Onboarding Guide", convos: 113, pct: 31, color: "#F59E0B" },
];

/* ── Small UI atoms ────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)]">
        <Sparkles size={18} />
      </span>
      <span className="text-[17px] font-extrabold tracking-tight" style={{ color: INK }}>
        OraOne
      </span>
    </div>
  );
}

function Delta({ up, children }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        color: up ? "#067647" : "#B42318",
        background: up ? "#ECFDF3" : "#FEF3F2",
      }}
    >
      <ArrowUpRight size={11} style={{ transform: up ? "none" : "rotate(90deg)" }} />
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#EAECF2] bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[#0B1220]">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[11px]" style={{ color: p.color }}>
          {p.dataKey}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function Demo4() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="min-h-screen w-full font-sans antialiased" style={{ background: CANVAS, color: INK }}>
      <DemoSwitcher />

      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* ===================== SIDEBAR ===================== */}
        <aside className="sticky top-0 hidden h-screen w-[252px] flex-shrink-0 flex-col border-r border-[#EAECF2] bg-white lg:flex">
          <div className="flex h-16 items-center border-b border-[#EAECF2] px-5">
            <Logo />
          </div>

          {/* project switcher */}
          <button className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-[#EAECF2] bg-[#F9FAFC] px-3 py-2.5 text-left transition-colors hover:bg-white">
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-[11px] font-bold text-white">
                AC
              </span>
              <span>
                <span className="block text-[13px] font-bold leading-tight" style={{ color: INK }}>
                  Acme Inc
                </span>
                <span className="block text-[11px]" style={{ color: MUTED }}>
                  Production
                </span>
              </span>
            </span>
            <ChevronsUpDown size={15} color={MUTED} />
          </button>

          {/* create CTA */}
          <button className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.7)] transition-opacity hover:opacity-95">
            <Plus size={17} /> Create AI Agent
          </button>

          <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
            {NAV.map((group, gi) => (
              <div key={gi} className={group.section ? "pt-4" : ""}>
                {group.section && (
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                    {group.section}
                  </p>
                )}
                {group.items.map((it) => (
                  <a
                    key={it.label}
                    href="#"
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      it.active
                        ? "bg-[#EFF4FF] text-[#2563EB]"
                        : "text-[#475467] hover:bg-[#F6F8FC] hover:text-[#0B1220]"
                    }`}
                  >
                    <it.icon size={18} className={it.active ? "" : "opacity-80"} />
                    {it.label}
                    {it.active && <span className="ml-auto size-1.5 rounded-full bg-[#2563EB]" />}
                  </a>
                ))}
              </div>
            ))}
          </nav>

          {/* upgrade card */}
          <div className="mx-3 mb-4 rounded-2xl border border-[#E6EAF5] bg-gradient-to-br from-[#EFF4FF] to-[#F5F3FF] p-4">
            <p className="text-[13px] font-bold" style={{ color: INK }}>
              You're on Starter
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: SUB }}>
              Unlock voice agents & unlimited seats.
            </p>
            <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-[#0B1220] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
              Upgrade <ArrowRight size={14} />
            </button>
          </div>
        </aside>

        {/* ===================== MAIN ===================== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* ---- top bar ---- */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#EAECF2] bg-white/85 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Logo />
            </div>
            <div className="hidden flex-1 lg:block">
              <div className="flex max-w-md items-center gap-2 rounded-xl border border-[#EAECF2] bg-[#F9FAFC] px-3 py-2 text-sm">
                <Search size={16} color={MUTED} />
                <span style={{ color: MUTED }}>Search agents, conversations, docs…</span>
                <span className="ml-auto rounded-md border border-[#EAECF2] bg-white px-1.5 py-0.5 text-[11px] font-medium" style={{ color: MUTED }}>
                  ⌘K
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="relative grid size-9 place-items-center rounded-xl border border-[#EAECF2] bg-white text-[#475467] transition-colors hover:bg-[#F6F8FC]">
                <Bell size={17} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#F04438] ring-2 ring-white" />
              </button>
              <button className="grid size-9 place-items-center rounded-xl border border-[#EAECF2] bg-white text-[#475467] transition-colors hover:bg-[#F6F8FC]">
                <Settings size={17} />
              </button>
              <button className="flex items-center gap-2 rounded-xl border border-[#EAECF2] bg-white py-1 pl-1 pr-2 transition-colors hover:bg-[#F6F8FC]">
                <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-[12px] font-bold text-white">
                  JD
                </span>
                <ChevronDown size={15} color={MUTED} />
              </button>
            </div>
          </header>

          {/* ---- content ---- */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1240px] space-y-7 p-4 sm:p-6 lg:p-8">
              {/* greeting */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND }}>
                    <span className="size-2.5 rounded-full bg-[#2563EB]" />
                    Good morning · Acme Inc
                  </p>
                  <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]" style={{ color: INK }}>
                    Everything happening across your project.
                  </h1>
                  <p className="mt-1.5 text-sm" style={{ color: SUB }}>
                    Live metrics, recent activity and usage — updated in real time.
                  </p>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] transition-opacity hover:opacity-95">
                  <Plus size={16} /> New Agent
                </button>
              </div>

              {/* guided banner */}
              <div className="group flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#DCE6FF] bg-gradient-to-r from-[#EFF4FF] via-[#F3F1FF] to-[#ECFEFF] p-5">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-white shadow-sm">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: INK }}>
                      Build your AI in 5 guided steps
                    </p>
                    <p className="text-[13px]" style={{ color: SUB }}>
                      Goal → knowledge → model → customize → deploy. We wire everything for you.
                    </p>
                  </div>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-[#1D4ED8]">
                  Start guided setup <ArrowRight size={15} />
                </button>
              </div>

              {/* KPI grid */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: INK }}>
                    Live Metrics
                  </h2>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    · last 30 days
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {KPIS.map((k) => (
                    <div
                      key={k.label}
                      className={`${CARD} group p-4 transition-all hover:-translate-y-0.5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid size-9 place-items-center rounded-xl" style={{ background: k.bg }}>
                          <k.icon size={16} style={{ color: k.tone }} />
                        </span>
                        <Delta up={k.up}>{k.delta}</Delta>
                      </div>
                      <p className="mt-3 text-[24px] font-extrabold tracking-tight" style={{ color: INK }}>
                        {k.value}
                      </p>
                      <p className="mt-0.5 text-[12px]" style={{ color: SUB }}>
                        {k.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* charts row */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* area chart */}
                <div className={`${CARD} p-5 lg:col-span-2`}>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: INK }}>
                        Activity over time
                      </h3>
                      <p className="text-[13px]" style={{ color: SUB }}>
                        Messages & conversations
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]" style={{ color: SUB }}>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#2563EB]" /> Messages
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#06B6D4]" /> Conversations
                      </span>
                    </div>
                  </div>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={SERIES} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.24} />
                            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6" vertical={false} />
                        <XAxis dataKey="d" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="messages" stroke="#2563EB" strokeWidth={2.5} fill="url(#gMsg)" />
                        <Area type="monotone" dataKey="conversations" stroke="#06B6D4" strokeWidth={2.5} fill="url(#gConv)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* donut */}
                <div className={`${CARD} p-5`}>
                  <h3 className="text-[15px] font-bold" style={{ color: INK }}>
                    Channels
                  </h3>
                  <p className="text-[13px]" style={{ color: SUB }}>
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
                            <Cell key={c.name} fill={c.color} opacity={hovered === null || hovered === i ? 1 : 0.4} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[22px] font-extrabold" style={{ color: INK }}>
                        1,284
                      </span>
                      <span className="text-[11px]" style={{ color: MUTED }}>
                        total
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {CHANNELS.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2" style={{ color: SUB }}>
                          <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-semibold" style={{ color: INK }}>
                          {c.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* bottom row: conversations + top agents */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* recent conversations */}
                <div className={`${CARD} overflow-hidden lg:col-span-2`}>
                  <div className="flex items-center justify-between border-b border-[#EAECF2] p-5">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: INK }}>
                        Recent conversations
                      </h3>
                      <p className="text-[13px]" style={{ color: SUB }}>
                        Across every channel
                      </p>
                    </div>
                    <button className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: BRAND }}>
                      View all <ChevronDown size={14} className="-rotate-90" />
                    </button>
                  </div>
                  <div className="divide-y divide-[#F1F3F8]">
                    {CONVERSATIONS.map((c) => (
                      <div key={c.name} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#FAFBFD]">
                        <span className="grid size-9 flex-shrink-0 place-items-center rounded-xl" style={{ background: c.bg }}>
                          <c.icon size={16} style={{ color: c.tone }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14px] font-semibold" style={{ color: INK }}>
                              {c.name}
                            </p>
                            <span className="text-[11px]" style={{ color: MUTED }}>
                              {c.channel}
                            </span>
                          </div>
                          <p className="truncate text-[13px]" style={{ color: SUB }}>
                            {c.q}
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-[12px] font-medium" style={{ color: SUB }}>
                            {c.agent}
                          </p>
                          <p className="text-[11px]" style={{ color: MUTED }}>
                            {c.time} ago
                          </p>
                        </div>
                        <span
                          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: c.bg, color: c.tone }}
                        >
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* top agents */}
                <div className={`${CARD} p-5`}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: INK }}>
                        Top agents
                      </h3>
                      <p className="text-[13px]" style={{ color: SUB }}>
                        By conversations
                      </p>
                    </div>
                    <span className="grid size-8 place-items-center rounded-lg bg-[#F5F3FF]">
                      <Bot size={15} color="#7C3AED" />
                    </span>
                  </div>
                  <div className="space-y-4">
                    {TOP_AGENTS.map((a) => (
                      <div key={a.name}>
                        <div className="mb-1.5 flex items-center justify-between text-[13px]">
                          <span className="font-semibold" style={{ color: INK }}>
                            {a.name}
                          </span>
                          <span style={{ color: SUB }}>{a.convos}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F3F8]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${a.pct}%`, background: a.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#EAECF2] bg-white py-2.5 text-[13px] font-semibold transition-colors hover:bg-[#F6F8FC]" style={{ color: INK }}>
                    Manage agents <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="pb-6 text-center text-[12px]" style={{ color: MUTED }}>
                Direction 4 · “Luminous” — premium light theme · demo data
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
