import React from "react";
import {
  MessageSquare,
  Users,
  TrendingUp,
  PhoneMissed,
  Phone,
  MessageCircle,
  Calendar,
  Info,
  ChevronDown,
  CalendarRange,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const KPI_CARDS = [
  { key: "convos", label: "Total Conversations", icon: MessageSquare, tone: "#2563EB", value: "5,490", delta: "18.2%" },
  { key: "leads",  label: "Total Leads",         icon: Users,         tone: "#22C55E", value: "689",   delta: "25.3%" },
  { key: "conv",   label: "Conversion Rate",     icon: TrendingUp,    tone: "#7C3AED", value: "24.5%", delta: "3.1%"  },
  { key: "missed", label: "Missed Calls Saved",  icon: PhoneMissed,   tone: "#F59E0B", value: "318",   delta: "12.0%" },
];

const TREND_BY_KPI = {
  convos: [42, 50, 46, 55, 60, 68, 78],
  leads:  [28, 30, 33, 38, 42, 50, 58],
  conv:   [18, 22, 21, 25, 23, 28, 32],
  missed: [14, 18, 20, 22, 26, 30, 36],
};

const CONV_OVER_TIME = [
  { day: "May 20", Calls: 720, Chats: 460, WhatsApp: 200 },
  { day: "May 21", Calls: 560, Chats: 320, WhatsApp: 210 },
  { day: "May 22", Calls: 690, Chats: 420, WhatsApp: 230 },
  { day: "May 23", Calls: 640, Chats: 390, WhatsApp: 230 },
  { day: "May 24", Calls: 870, Chats: 560, WhatsApp: 330 },
  { day: "May 25", Calls: 740, Chats: 490, WhatsApp: 320 },
  { day: "May 26", Calls: 790, Chats: 560, WhatsApp: 400 },
];

const CHANNEL_PERF = [
  { channel: "Voice",    score: 75, color: "#2563EB", icon: Phone },
  { channel: "Chat",     score: 85, color: "#22C55E", icon: MessageSquare },
  { channel: "WhatsApp", score: 92, color: "#F59E0B", icon: MessageCircle },
];

const TOP_AGENTS = [
  { name: "Rahul Sharma", initials: "RS", color: "#2563EB", count: 1246, pct: 76 },
  { name: "Priya Patel",  initials: "PP", color: "#7C3AED", count: 1032, pct: 64 },
  { name: "Amit Verma",   initials: "AV", color: "#22C55E", count: 892,  pct: 58 },
];

const LEAD_SOURCES = [
  { name: "Website",    value: 45, color: "#2563EB" },
  { name: "WhatsApp",   value: 30, color: "#22C55E" },
  { name: "Phone Call", value: 15, color: "#7C3AED" },
  { name: "Referral",   value: 7,  color: "#F59E0B" },
  { name: "Others",     value: 3,  color: "#94A3B8" },
];

const FUNNEL = [
  { label: "Total Conversations",  value: 5490, conv: null,   color: "#2563EB", icon: MessageSquare },
  { label: "Interested",           value: 1890, conv: "34.4%", color: "#22C55E", icon: Users },
  { label: "Leads Generated",      value: 689,  conv: "36.5%", color: "#7C3AED", icon: Target },
  { label: "Appointments Booked",  value: 342,  conv: "49.6%", color: "#F59E0B", icon: Calendar },
];

export default function Analytics() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Analytics</h2>
          <p className="text-sm text-[#64748B] mt-1">Deep insights into your AI agent performance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]" data-testid="analytics-range">
            <CalendarRange size={14} /> Last 7 days <ChevronDown size={13} className="text-[#94A3B8]" />
          </button>
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]" data-testid="analytics-custom-range">
            <Calendar size={14} /> Custom Range
          </button>
        </div>
      </div>

      {/* KPI cards with sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((k) => (
          <div
            key={k.key}
            className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:shadow-premium hover:-translate-y-0.5 transition-all"
            data-testid={`analytics-kpi-${k.key}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="size-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${k.tone}1A` }}>
                  <k.icon size={18} style={{ color: k.tone }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#64748B] leading-tight">{k.label}</p>
                  <p className="mt-1.5 text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{k.value}</p>
                  <p className="mt-2 text-[12px] font-semibold text-[#16A34A] inline-flex items-center gap-1">
                    <TrendingUp size={11} /> {k.delta}
                  </p>
                  <p className="text-[10.5px] text-[#94A3B8] mt-0.5">vs May 13 – May 19</p>
                </div>
              </div>
              <Sparkline data={TREND_BY_KPI[k.key]} color={k.tone} />
            </div>
          </div>
        ))}
      </div>

      {/* Conversations Over Time + Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Line chart */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]">Conversations Over Time</h3>
              <Info size={13} className="text-[#94A3B8]" />
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#475569]">
              {[
                { label: "Calls",    color: "#2563EB" },
                { label: "Chats",    color: "#22C55E" },
                { label: "WhatsApp", color: "#F59E0B" },
              ].map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: l.color }} /> {l.label}
                </span>
              ))}
              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]">
                Daily <ChevronDown size={12} className="text-[#94A3B8]" />
              </button>
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CONV_OVER_TIME} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="aCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aWa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="Calls"    stroke="#2563EB" strokeWidth={2.5} fill="url(#aCalls)" dot={{ r: 3, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Chats"    stroke="#22C55E" strokeWidth={2.5} fill="url(#aChats)" dot={{ r: 3, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="WhatsApp" stroke="#F59E0B" strokeWidth={2.5} fill="url(#aWa)"    dot={{ r: 3, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Performance bars */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]">Channel Performance</h3>
              <Info size={13} className="text-[#94A3B8]" />
            </div>
            <button className="text-[12px] font-medium text-[#2563EB] hover:underline">View full report</button>
          </div>
          <div className="mt-3 h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHANNEL_PERF} margin={{ left: -12, right: 8, top: 28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="channel" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => [`${v}%`, "Score"]} />
                <Bar dataKey="score" radius={[10, 10, 10, 10]} barSize={56} label={{ position: "top", fill: "#0F172A", fontSize: 12, fontWeight: 700, formatter: (v) => `${v}%` }}>
                  {CHANNEL_PERF.map((c) => (
                    <Cell key={c.channel} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Channel icons sit on bottom of the bars */}
            <div className="absolute inset-x-0 bottom-7 flex items-center justify-around pointer-events-none px-8">
              {CHANNEL_PERF.map((c) => (
                <div key={c.channel} className="size-9 rounded-full bg-white/30 border border-white/60 grid place-items-center backdrop-blur-sm" style={{ boxShadow: `inset 0 -2px 0 rgba(255,255,255,0.4)` }}>
                  <c.icon size={16} className="text-white opacity-90" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Top Agents / Lead Sources / Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top performing agents */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]">Top Performing Agents</h3>
              <Info size={13} className="text-[#94A3B8]" />
            </div>
            <button className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>
          </div>
          <div className="mt-5 space-y-5">
            {TOP_AGENTS.map((a) => (
              <div key={a.name}>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full grid place-items-center text-white text-[11.5px] font-semibold shrink-0" style={{ background: a.color }}>
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#0F172A]">{a.name}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{a.count.toLocaleString()} conversations</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                  <span className="text-[12px] font-bold text-[#0F172A] tabular-nums">{a.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]">Lead Source Distribution</h3>
              <Info size={13} className="text-[#94A3B8]" />
            </div>
            <button className="text-[12px] font-medium text-[#2563EB] hover:underline">View report</button>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-4 items-center">
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={LEAD_SOURCES} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                    {LEAD_SOURCES.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v, n) => [`${v}%`, n]} />
                  <Legend content={() => null} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold tracking-tight text-[#0F172A] leading-none">689</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Total Leads</p>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {LEAD_SOURCES.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-[#475569]">
                    <span className="size-2 rounded-full shrink-0" style={{ background: s.color }} /> {s.name}
                  </span>
                  <span className="font-semibold text-[#0F172A]">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]">Conversion Funnel</h3>
              <Info size={13} className="text-[#94A3B8]" />
            </div>
            <button className="text-[12px] font-medium text-[#2563EB] hover:underline">View full report</button>
          </div>
          <div className="mt-4 space-y-2">
            {FUNNEL.map((f, i) => {
              // Width shrinks each step (90% -> 78% -> 66% -> 54%)
              const widthPct = 90 - i * 12;
              return (
                <div key={f.label} className="flex items-center gap-4">
                  <div
                    className="relative grid place-items-center text-white font-semibold text-[13px] transition-all"
                    style={{
                      width: `${widthPct}%`,
                      background: f.color,
                      clipPath:
                        i === 0
                          ? "polygon(0 0, 100% 0, 92% 100%, 8% 100%)"
                          : i === FUNNEL.length - 1
                          ? "polygon(8% 0, 92% 0, 80% 100%, 20% 100%)"
                          : "polygon(4% 0, 96% 0, 88% 100%, 12% 100%)",
                      height: 64,
                    }}
                  >
                    <f.icon size={20} className="text-white opacity-90" />
                  </div>
                  <div className="min-w-0 w-32 shrink-0">
                    <p className="text-[15px] font-bold text-[#0F172A] leading-none">{f.value.toLocaleString()}</p>
                    <p className="text-[11px] text-[#64748B] mt-1">{f.label}</p>
                  </div>
                  {f.conv && (
                    <div className="rounded-xl bg-[#F1F5F9] px-3 py-1.5 text-center">
                      <p className="text-[13px] font-bold text-[#0F172A] leading-none">{f.conv}</p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Conversion Rate</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sparkline ---------- */

function Sparkline({ data, color }) {
  const series = data.map((v, i) => ({ x: i, y: v }));
  return (
    <div className="w-24 h-16 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 6, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
