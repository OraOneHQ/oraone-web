import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Upload,
  UserPlus,
  Download,
  Plug,
  Star,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Target,
  BookOpen,
  Bot,
  Settings as SettingsIcon,
  Bell,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";

/* ──────────────────────────────────────────────────────────────────── */
/*  Mock data                                                           */
/* ──────────────────────────────────────────────────────────────────── */
const SNAPSHOT = [
  { key: "calls", label: "Calls Answered", value: 127, icon: Phone, tone: "#2563EB", bg: "#EFF6FF", delta: "+12%" },
  { key: "chats", label: "Chats Handled", value: 342, icon: MessageSquare, tone: "#7C3AED", bg: "#EDE9FE", delta: "+18%" },
  { key: "wa", label: "WhatsApp Conversations", value: 89, icon: MessageCircle, tone: "#16A34A", bg: "#DCFCE7", delta: "+9%" },
  { key: "leads", label: "Leads Captured", value: 41, icon: Users, tone: "#0EA5E9", bg: "#E0F2FE", delta: "+27%" },
  { key: "appt", label: "Appointments Booked", value: 18, icon: Calendar, tone: "#F59E0B", bg: "#FEF3C7", delta: "+15%" },
];

const ATTENTION = [
  { icon: Users, count: 5, label: "High Priority Leads", tone: "#DC2626", bg: "#FEE2E2", cta: "Review Leads", to: "/app/leads", testid: "attn-leads" },
  { icon: AlertCircle, count: 3, label: "Failed Conversations", tone: "#EA580C", bg: "#FFEDD5", cta: "View Conversations", to: "/app/conversations", testid: "attn-failed" },
  { icon: BookOpen, count: 2, label: "Knowledge Gaps Detected", tone: "#CA8A04", bg: "#FEF9C3", cta: "Update Knowledge", to: "/app/knowledge-base", testid: "attn-kb" },
  { icon: Plug, count: 1, label: "Integration Disconnected", tone: "#7C3AED", bg: "#EDE9FE", cta: "Fix Integration", to: "/app/integrations", testid: "attn-int" },
];

const LEADERBOARD = [
  { name: "Voice Agent", icon: Phone, conv: 120, leads: 31, rating: 4.9, tone: "#2563EB", bg: "#EFF6FF" },
  { name: "Chat Agent", icon: MessageSquare, conv: 340, leads: 25, rating: 4.8, tone: "#7C3AED", bg: "#EDE9FE" },
  { name: "WhatsApp Agent", icon: MessageCircle, conv: 87, leads: 18, rating: 4.7, tone: "#16A34A", bg: "#DCFCE7" },
];

const ACTIVITY = [
  { time: "2 mins ago", event: "Lead captured", who: "Aarav Mehta · WhatsApp", icon: Users, tone: "#0EA5E9", bg: "#E0F2FE" },
  { time: "8 mins ago", event: "Appointment booked", who: "Dr. Priya Sharma · Voice Agent", icon: Calendar, tone: "#F59E0B", bg: "#FEF3C7" },
  { time: "14 mins ago", event: "Conversation escalated", who: "Rahul Mehta · Chat → Human", icon: AlertCircle, tone: "#DC2626", bg: "#FEE2E2" },
  { time: "22 mins ago", event: "Knowledge base updated", who: "FAQs · 12 new entries", icon: BookOpen, tone: "#7C3AED", bg: "#EDE9FE" },
  { time: "31 mins ago", event: "WhatsApp message received", who: "+91 98765 43210", icon: MessageCircle, tone: "#16A34A", bg: "#DCFCE7" },
  { time: "47 mins ago", event: "New lead qualified", who: "Sneha Iyer · Growth plan interest", icon: TrendingUp, tone: "#2563EB", bg: "#EFF6FF" },
];

const FUNNEL = [
  { label: "Conversations", value: 558, pct: 100, tone: "#2563EB" },
  { label: "Qualified Leads", value: 234, pct: 42, tone: "#7C3AED" },
  { label: "Appointments", value: 87, pct: 16, tone: "#0EA5E9" },
  { label: "Customers", value: 31, pct: 6, tone: "#16A34A" },
];

const CHANNEL_BREAKDOWN = [
  { name: "Voice Agent", value: 45, color: "#2563EB" },
  { name: "Chat Agent", value: 35, color: "#7C3AED" },
  { name: "WhatsApp Agent", value: 20, color: "#16A34A" },
];

const QUICK_ACTIONS = [
  { label: "Create Agent", icon: Bot, to: "/app/agents/new", testid: "qa-create-agent" },
  { label: "Upload Knowledge", icon: Upload, to: "/app/knowledge-base", testid: "qa-upload-kb" },
  { label: "Connect WhatsApp", icon: MessageCircle, to: "/app/integrations", testid: "qa-connect-wa" },
  { label: "Invite Team", icon: UserPlus, to: "/app/team", testid: "qa-invite-team" },
  { label: "Export Leads", icon: Download, to: "/app/leads", testid: "qa-export-leads" },
];

const UPCOMING = [
  { title: "Agent Training Required", desc: "Voice Agent accuracy below 85% on insurance queries.", icon: Bot, tone: "#DC2626", bg: "#FEE2E2" },
  { title: "Knowledge Base Review", desc: "12 unanswered questions need new entries.", icon: BookOpen, tone: "#7C3AED", bg: "#EDE9FE" },
  { title: "Pending Team Invitation", desc: "Sneha Iyer hasn't accepted (sent 3 days ago).", icon: UserPlus, tone: "#F59E0B", bg: "#FEF3C7" },
  { title: "New Integration Available", desc: "Razorpay and Stripe are now supported.", icon: Sparkles, tone: "#2563EB", bg: "#EFF6FF" },
];

const ROI = [
  { label: "Leads Captured", value: "689", icon: Users, tone: "#0EA5E9", bg: "#E0F2FE" },
  { label: "Hours Saved", value: "412", icon: Clock, tone: "#2563EB", bg: "#EFF6FF" },
  { label: "Calls Automated", value: "1,246", icon: Phone, tone: "#7C3AED", bg: "#EDE9FE" },
  { label: "Appointments Booked", value: "342", icon: Calendar, tone: "#F59E0B", bg: "#FEF3C7" },
  { label: "Estimated Revenue Impact", value: "₹18.4L", icon: DollarSign, tone: "#16A34A", bg: "#DCFCE7", big: true },
];

const TREND = [
  { d: "Mon", v: 28 }, { d: "Tue", v: 42 }, { d: "Wed", v: 35 }, { d: "Thu", v: 56 },
  { d: "Fri", v: 64 }, { d: "Sat", v: 49 }, { d: "Sun", v: 72 },
];

/* ──────────────────────────────────────────────────────────────────── */
export default function Overview() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <div className="space-y-8" data-testid="dashboard-overview">
      {/* ===== Greeting bar ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.18em] text-[#2563EB] uppercase">
            Command Center
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#0F172A]">
            {greeting}, here&apos;s today&apos;s snapshot.
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            What needs attention, what&apos;s working and what to do next — at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="header-bell"
            className="size-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] grid place-items-center relative"
          >
            <Bell size={16} className="text-[#475569]" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
          </button>
          <Link
            to="/app/agents/new"
            data-testid="header-cta-new-agent"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-colors"
          >
            <Plus size={15} /> New Agent
          </Link>
        </div>
      </div>

      {/* ===== 1. AI Business Snapshot ===== */}
      <Section title="AI Business Snapshot" subtitle="Today · auto-updating every 60 seconds" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {SNAPSHOT.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-testid={`snapshot-${s.key}`}
              className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:shadow-premium transition-all"
            >
              <div className="flex items-center justify-between">
                <span
                  className="size-9 rounded-xl grid place-items-center"
                  style={{ background: s.bg }}
                >
                  <s.icon size={16} style={{ color: s.tone }} />
                </span>
                <span className="text-[11px] font-bold text-[#16A34A] inline-flex items-center gap-0.5">
                  <ArrowUpRight size={11} /> {s.delta}
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-[#0F172A] tracking-tight">{s.value}</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== 2. Needs Attention ===== */}
      <Section title="Needs Attention" subtitle="4 items require your action today" icon={AlertCircle} tone="#DC2626">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ATTENTION.map((a) => (
            <div
              key={a.label}
              data-testid={a.testid}
              className="p-5 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#DC2626]/30 hover:shadow-premium transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-xl grid place-items-center" style={{ background: a.bg }}>
                  <a.icon size={18} style={{ color: a.tone }} />
                </span>
                <div>
                  <p className="text-2xl font-black text-[#0F172A] leading-none">{a.count}</p>
                  <p className="text-[12px] text-[#64748B] mt-1">{a.label}</p>
                </div>
              </div>
              <Link
                to={a.to}
                className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2563EB] hover:gap-2 transition-all"
              >
                {a.cta} <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 3 + 4. Leaderboard + Activity ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <Section title="Agent Performance Leaderboard" subtitle="Last 7 days" icon={TrendingUp}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden" data-testid="leaderboard">
              <table className="w-full">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <Th>Agent</Th>
                    <Th>Conversations</Th>
                    <Th>Leads</Th>
                    <Th>Rating</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {LEADERBOARD.map((row, i) => (
                    <tr key={row.name} className="hover:bg-[#F8FAFC] transition-colors" data-testid={`leaderboard-row-${i}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="size-8 rounded-xl grid place-items-center" style={{ background: row.bg }}>
                            <row.icon size={14} style={{ color: row.tone }} />
                          </span>
                          <span className="text-[13.5px] font-semibold text-[#0F172A]">{row.name}</span>
                          {i === 0 && (
                            <span className="text-[10px] font-bold tracking-wider text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full">
                              TOP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13.5px] text-[#0F172A] font-medium tabular-nums">{row.conv}</td>
                      <td className="px-5 py-4 text-[13.5px] text-[#0F172A] font-medium tabular-nums">{row.leads}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#0F172A]">
                          <Star size={13} className="text-[#F59E0B] fill-[#F59E0B]" />
                          {row.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* Activity Feed */}
        <div>
          <Section title="Live Activity" subtitle="Real-time events" icon={Zap}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="activity-feed">
              <ol className="space-y-4">
                {ACTIVITY.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="size-8 rounded-xl grid place-items-center flex-shrink-0" style={{ background: a.bg }}>
                      <a.icon size={14} style={{ color: a.tone }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A]">{a.event}</p>
                      <p className="text-[11.5px] text-[#64748B] mt-0.5 truncate">{a.who}</p>
                      <p className="text-[10.5px] text-[#94A3B8] mt-0.5">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        </div>
      </div>

      {/* ===== 5 + 6. Funnel + Channel Breakdown ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2">
          <Section title="Lead Funnel" subtitle="Last 30 days · conversion at each stage" icon={Target}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6" data-testid="funnel">
              <div className="space-y-3">
                {FUNNEL.map((f, i) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-[#0F172A]">{f.label}</span>
                      <span className="text-[12px] text-[#64748B] tabular-nums">
                        {f.value.toLocaleString()} <span className="text-[#94A3B8]">· {f.pct}%</span>
                      </span>
                    </div>
                    <div className="h-9 rounded-xl bg-[#F1F5F9] overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        className="h-full rounded-xl"
                        style={{ background: `linear-gradient(90deg, ${f.tone}, ${f.tone}dd)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#2563EB] mb-3">7-DAY TREND</p>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={TREND}>
                      <defs>
                        <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="v" stroke="#2563EB" strokeWidth={2} fill="url(#leadGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Channel Breakdown */}
        <div>
          <Section title="Channel Breakdown" subtitle="Lead source distribution" icon={PieChart}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6" data-testid="channel-breakdown">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CHANNEL_BREAKDOWN}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {CHANNEL_BREAKDOWN.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2.5">
                {CHANNEL_BREAKDOWN.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[13px] text-[#0F172A]">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{c.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        </div>
      </div>

      {/* ===== 7 + 8. Quick Actions + Upcoming ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div>
          <Section title="Quick Actions" subtitle="One-click access" icon={Zap}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 space-y-1" data-testid="quick-actions">
              {QUICK_ACTIONS.map((qa) => (
                <Link
                  key={qa.label}
                  to={qa.to}
                  data-testid={qa.testid}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors group"
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="size-8 rounded-lg bg-[#EFF6FF] grid place-items-center">
                      <qa.icon size={14} className="text-[#2563EB]" />
                    </span>
                    <span className="text-[13.5px] font-semibold text-[#0F172A]">{qa.label}</span>
                  </span>
                  <ChevronRight size={14} className="text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Upcoming Tasks" subtitle="Pick something up from your queue" icon={Sparkles}>
            <div className="grid sm:grid-cols-2 gap-3" data-testid="upcoming">
              {UPCOMING.map((u) => (
                <div
                  key={u.title}
                  className="p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#2563EB]/30 hover:shadow-premium transition-all flex gap-3"
                >
                  <span className="size-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: u.bg }}>
                    <u.icon size={15} style={{ color: u.tone }} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#0F172A]">{u.title}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* ===== 9. ROI ===== */}
      <Section title="Estimated Value Generated" subtitle="ROI delivered by your AI agents this month" icon={DollarSign}>
        <div className="rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] p-6 sm:p-8 text-white relative overflow-hidden" data-testid="roi-section">
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="absolute -top-12 -right-12 size-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-12 -left-12 size-64 rounded-full bg-[#60A5FA] blur-3xl" />
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {ROI.map((r) => (
              <div
                key={r.label}
                className={`${r.big ? "col-span-2 sm:col-span-3 lg:col-span-1 lg:row-span-1" : ""}`}
              >
                <span className="size-9 rounded-xl bg-white/15 grid place-items-center">
                  <r.icon size={16} className="text-white" />
                </span>
                <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">{r.value}</p>
                <p className="text-[12px] text-white/80 mt-1">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
function Section({ title, subtitle, icon: Icon, tone = "#2563EB", children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="size-7 rounded-lg grid place-items-center" style={{ background: `${tone}15` }}>
          <Icon size={14} style={{ color: tone }} />
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
    <th className="px-5 py-3 text-left text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
      {children}
    </th>
  );
}
