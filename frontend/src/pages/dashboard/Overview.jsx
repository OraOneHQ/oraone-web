import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Users,
  MessagesSquare,
  Coins,
  DollarSign,
  Plug,
  Globe,
  Sparkles,
  Plus,
  ArrowRight,
  ChevronRight,
  Upload,
  UserPlus,
  TrendingUp,
  Zap,
  Gauge,
  Clock,
  CheckCircle2,
  Circle,
  Pause,
  LayoutGrid,
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
import { api } from "@/lib/api";
import { useProjects } from "@/lib/projects";

/* ──────────────────────────────────────────────────────────────────── */
/*  Helpers                                                              */
/* ──────────────────────────────────────────────────────────────────── */
const CHANNEL_COLORS = ["#2563EB", "#7C3AED", "#16A34A", "#F59E0B", "#0EA5E9", "#EC4899", "#64748B"];

const fmtNum = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const shortDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
};

const STATUS_BADGE = (status) => {
  const s = String(status || "").toLowerCase();
  if (["ready", "active", "connected", "published", "succeeded", "processed"].includes(s))
    return "bg-[#DCFCE7] text-[#15803D]";
  if (["crawling", "pending", "processing", "in_progress", "draft", "queued"].includes(s))
    return "bg-[#FEF3C7] text-[#B45309]";
  if (["failed", "error", "paused", "cancelled"].includes(s)) return "bg-[#FEE2E2] text-[#B91C1C]";
  return "bg-[#F1F5F9] text-[#475569]";
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Data hooks                                                           */
/* ──────────────────────────────────────────────────────────────────── */
function useDashboardData() {
  const [state, setState] = useState({
    loading: true,
    overview: null,
    cost: null,
    metrics: null,
    conversations: [],
    websites: [],
    agents: [],
    activity: [],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const calls = [
        api.get("/analytics/overview", { params: { days: 30 } }),
        api.get("/analytics/cost", { params: { days: 30 } }),
        api.get("/system/metrics", { params: { hours: 24 } }),
        api.get("/conversations", { params: { limit: 6, sort: "recent" } }),
        api.get("/websites", { params: { limit: 5 } }),
        api.get("/agents", { params: { limit: 100, sort: "-updated_at" } }),
        // Meaningful write events for the activity timeline (reads are excluded).
        ...ACTIVITY_ACTIONS.map((action) =>
          api.get("/audit-logs", { params: { limit: 6, action } })
        ),
      ];
      const results = await Promise.allSettled(calls);
      if (!active) return;
      const val = (r) => (r && r.status === "fulfilled" ? r.value.data : null);
      const [overview, cost, metrics, conversations, websites, agents] = results;
      const auditResults = results.slice(6).map(val);
      setState({
        loading: false,
        overview: val(overview),
        cost: val(cost),
        metrics: val(metrics),
        conversations: Array.isArray(val(conversations)) ? val(conversations) : [],
        websites: val(websites)?.items || [],
        agents: val(agents)?.items || [],
        activity: buildActivity(auditResults),
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/* Turn raw audit-log rows into a clean, human-readable activity timeline.
   We surface only meaningful write events and skip read/query/search noise. */
const ACTIVITY_ACTIONS = ["create", "update", "publish", "delete", "share", "export"];
const ACTIVITY_VERBS = {
  create: "created",
  update: "updated",
  delete: "deleted",
  publish: "published",
  share: "shared",
  share_enabled: "shared",
  export: "exported",
  version_added: "added a version to",
  checkout: "started checkout for",
  bulk_tag: "tagged",
  streaming_completed: "ran",
};
const ACTIVITY_RESOURCE = {
  agent: { label: "agent", icon: Bot, tone: "#7C3AED", bg: "#EDE9FE" },
  document: { label: "document", icon: Upload, tone: "#2563EB", bg: "#EFF6FF" },
  knowledge: { label: "knowledge", icon: Upload, tone: "#2563EB", bg: "#EFF6FF" },
  knowledge_base: { label: "knowledge base", icon: Upload, tone: "#2563EB", bg: "#EFF6FF" },
  website: { label: "website", icon: Globe, tone: "#0EA5E9", bg: "#E0F2FE" },
  lead: { label: "lead", icon: UserPlus, tone: "#16A34A", bg: "#DCFCE7" },
  widget: { label: "widget", icon: Plug, tone: "#EC4899", bg: "#FCE7F3" },
  conversation: { label: "conversation", icon: MessagesSquare, tone: "#16A34A", bg: "#DCFCE7" },
  workflow: { label: "workflow", icon: Zap, tone: "#F59E0B", bg: "#FEF3C7" },
  team: { label: "team", icon: Users, tone: "#0EA5E9", bg: "#E0F2FE" },
  project: { label: "project", icon: Sparkles, tone: "#2563EB", bg: "#EFF6FF" },
  org_branding: { label: "branding", icon: Sparkles, tone: "#7C3AED", bg: "#EDE9FE" },
  api_key: { label: "API key", icon: Plug, tone: "#64748B", bg: "#F1F5F9" },
  webhook_endpoint: { label: "webhook", icon: Plug, tone: "#64748B", bg: "#F1F5F9" },
  subscription: { label: "subscription", icon: DollarSign, tone: "#DC2626", bg: "#FEE2E2" },
};
function buildActivity(auditResults) {
  const out = [];
  const seen = new Set();
  for (const auditData of auditResults || []) {
    const logs = auditData?.logs || [];
    const actors = auditData?.actors || {};
    for (const log of logs) {
      if (seen.has(log.id)) continue;
      const verb = ACTIVITY_VERBS[log.action];
      const res = ACTIVITY_RESOURCE[log.resource];
      if (!verb || !res) continue; // skip noise (read/query/search/etc.)
      seen.add(log.id);
      const label = res.label;
      const article = /^[aeiou]/i.test(label) ? "an" : "a";
      out.push({
        id: log.id,
        actor: actors[log.user_id]?.name || "Someone",
        text: `${verb} ${article} ${label}`,
        resource: res,
        at: log.created_at,
      });
    }
  }
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return out.slice(0, 8);
}

/* ──────────────────────────────────────────────────────────────────── */
export default function Overview() {
  const [greeting, setGreeting] = useState("");
  const data = useDashboardData();
  const { activeProject } = useProjects();
  const projectName = activeProject?.name || "This";
  const projectColor = activeProject?.color || "#2563EB";

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const totals = data.overview?.totals || {};
  const costTotals = data.cost?.totals || {};
  const apiMetrics = data.metrics?.api || {};

  const activeAgents = useMemo(
    () => data.agents.filter((a) => String(a.status).toLowerCase() === "active").length,
    [data.agents]
  );
  const agentNames = useMemo(() => {
    const m = {};
    data.agents.forEach((a) => (m[a.id] = a.name));
    return m;
  }, [data.agents]);

  // Honest trend chip from the real 30d conversations series (recent half vs prior half).
  const convGrowth = useMemo(() => {
    const arr = data.overview?.series?.conversations || [];
    if (arr.length < 4) return null;
    const mid = Math.floor(arr.length / 2);
    const sum = (a) => a.reduce((s, p) => s + (Number(p.count) || 0), 0);
    const prev = sum(arr.slice(0, mid));
    const recent = sum(arr.slice(mid));
    if (prev <= 0) return null;
    const pct = ((recent - prev) / prev) * 100;
    if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) return null;
    return { delta: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
  }, [data.overview]);

  const kpis = [
    {
      key: "requests",
      label: "AI Requests · 24h",
      value: fmtNum(apiMetrics.requests),
      sub: apiMetrics.error_rate != null ? `${Number(apiMetrics.error_rate).toFixed(1)}% errors` : null,
      icon: Activity,
      tone: "#2563EB",
      bg: "#EFF6FF",
    },
    {
      key: "agents",
      label: "Active Agents",
      value: fmtNum(activeAgents),
      sub: `${fmtNum(totals.agents ?? data.agents.length)} total`,
      icon: Bot,
      tone: "#7C3AED",
      bg: "#EDE9FE",
      to: "/app/agents",
    },
    {
      key: "members",
      label: "Team Members",
      value: fmtNum(totals.members),
      icon: Users,
      tone: "#0EA5E9",
      bg: "#E0F2FE",
      to: "/app/team",
    },
    {
      key: "conversations",
      label: "Conversations · 30d",
      value: fmtNum(totals.conversations),
      sub: `${fmtNum(totals.messages)} messages`,
      icon: MessagesSquare,
      tone: "#16A34A",
      bg: "#DCFCE7",
      to: "/app/conversations",
      delta: convGrowth?.delta,
      up: convGrowth?.up,
    },
    {
      key: "tokens",
      label: "Token Usage · 30d",
      value: fmtNum(costTotals.total_tokens),
      icon: Coins,
      tone: "#F59E0B",
      bg: "#FEF3C7",
      to: "/app/usage",
    },
    {
      key: "cost",
      label: "Est. Cost · 30d",
      value: fmtMoney(costTotals.total_cost),
      sub: costTotals.projected_monthly_cost != null ? `${fmtMoney(costTotals.projected_monthly_cost)}/mo projected` : null,
      icon: DollarSign,
      tone: "#DC2626",
      bg: "#FEE2E2",
      to: "/app/usage",
    },
  ];

  const usageSeries = useMemo(() => {
    const msg = data.overview?.series?.messages || [];
    const conv = data.overview?.series?.conversations || [];
    const byDate = {};
    msg.forEach((p) => {
      byDate[p.date] = { date: p.date, d: shortDate(p.date), messages: p.count, conversations: 0 };
    });
    conv.forEach((p) => {
      byDate[p.date] = byDate[p.date] || { date: p.date, d: shortDate(p.date), messages: 0 };
      byDate[p.date].conversations = p.count;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.overview]);

  const channelData = useMemo(() => {
    const obj = data.overview?.breakdowns?.conversations_by_channel || {};
    return Object.entries(obj)
      .map(([name, value], i) => ({ name, value: Number(value), color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))
      .filter((c) => c.value > 0);
  }, [data.overview]);

  const channelTotal = useMemo(() => channelData.reduce((s, c) => s + c.value, 0), [channelData]);

  const topAgents = data.overview?.top_agents || [];
  const topAgentsMax = useMemo(
    () => topAgents.reduce((m, a) => Math.max(m, Number(a.conversations) || 0), 0),
    [topAgents]
  );

  const valueBand = [
    { label: "Conversations", value: fmtNum(totals.conversations), icon: MessagesSquare },
    { label: "Messages", value: fmtNum(totals.messages), icon: Activity },
    { label: "Documents", value: fmtNum(totals.documents), icon: Upload },
    { label: "Tokens", value: fmtNum(costTotals.total_tokens), icon: Coins },
    { label: "Projected / mo", value: fmtMoney(costTotals.projected_monthly_cost), icon: DollarSign, big: true },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-overview">
      {/* ===== Greeting bar ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] uppercase" style={{ color: projectColor }}>
            <span className="size-2.5 rounded-full" style={{ background: projectColor }} />
            {greeting ? `${greeting} · ` : ""}{projectName}{/project/i.test(projectName) ? "" : " Project"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#0F172A]">
            Everything happening across this project.
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Live metrics, recent activity and usage — scoped to {projectName}. Switch projects from the top-left to change context.
          </p>
        </div>
        <Link
          to="/app/create-agent"
          data-testid="header-cta-new-agent"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-colors"
        >
          <Plus size={15} /> New Agent
        </Link>
      </div>

      {/* ===== Guided setup banner ===== */}
      <Link
        to="/app/create-agent"
        data-testid="onboarding-banner"
        className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#ECFEFF] p-5 transition-shadow hover:shadow-premium"
      >
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] text-white shadow-sm">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">Build your AI in 5 guided steps</p>
            <p className="text-[13px] text-[#64748B]">
              Goal &rarr; knowledge &rarr; model &rarr; customize &rarr; deploy. We wire everything for you.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-[#1D4ED8]">
          Start guided setup <ArrowRight size={15} />
        </span>
      </Link>

      {/* ===== KPI grid ===== */}
      <Section title="Live Metrics" subtitle="Across this project" icon={Gauge}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.loading
            ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((s, i) => {
                const card = (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    data-testid={`kpi-${s.key}`}
                    className="h-full p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:shadow-premium transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="size-9 rounded-xl grid place-items-center" style={{ background: s.bg }}>
                        <s.icon size={16} style={{ color: s.tone }} />
                      </span>
                      {s.delta && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            color: s.up ? "#067647" : "#B42318",
                            background: s.up ? "#ECFDF3" : "#FEF3F2",
                          }}
                        >
                          <TrendingUp size={11} style={{ transform: s.up ? "none" : "scaleY(-1)" }} />
                          {s.delta}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-2xl font-black text-[#0F172A] tracking-tight">{s.value}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">{s.label}</p>
                    {s.sub && <p className="text-[11px] text-[#94A3B8] mt-1">{s.sub}</p>}
                  </motion.div>
                );
                return s.to ? (
                  <Link key={s.key} to={s.to} className="block">
                    {card}
                  </Link>
                ) : (
                  <div key={s.key}>{card}</div>
                );
              })}
        </div>
      </Section>

      {/* ===== Usage chart ===== */}
      <Section title="Usage Trend" subtitle="Messages & conversations · last 30 days" icon={TrendingUp}>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="usage-chart">
          {usageSeries.length === 0 ? (
            <EmptyState label="No usage yet — start a conversation to see trends." />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-end gap-4 text-[12px] text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#2563EB]" /> Messages
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#16A34A]" /> Conversations
                </span>
              </div>
              <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageSeries}>
                  <defs>
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="messages" stroke="#2563EB" strokeWidth={2} fill="url(#msgGrad)" />
                  <Area type="monotone" dataKey="conversations" stroke="#16A34A" strokeWidth={2} fill="url(#convGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </>
          )}
        </div>
      </Section>

      {/* ===== Top agents + Channel breakdown ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Top Agents" subtitle="Most active · last 30 days" icon={TrendingUp}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="top-agents">
              {topAgents.length === 0 ? (
                <EmptyState label="No agent activity yet — create one to see rankings." />
              ) : (
                <ul className="space-y-4">
                  {topAgents.map((row, i) => {
                    const pct = topAgentsMax ? Math.max(6, Math.round((Number(row.conversations) / topAgentsMax) * 100)) : 0;
                    const inner = (
                      <>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className="size-7 rounded-lg grid place-items-center bg-[#EDE9FE] flex-shrink-0">
                              <Bot size={13} className="text-[#7C3AED]" />
                            </span>
                            <span className="text-[13.5px] font-semibold text-[#0F172A] truncate">{row.name || "Untitled agent"}</span>
                            {i === 0 && (
                              <span className="text-[10px] font-bold tracking-wider text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full flex-shrink-0">
                                TOP
                              </span>
                            )}
                          </span>
                          <span className="text-[13px] font-bold text-[#0F172A] tabular-nums flex-shrink-0">{fmtNum(row.conversations)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5]" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    );
                    return (
                      <li key={row.agent_id || i}>
                        {row.agent_id ? (
                          <Link to={`/app/agents/${row.agent_id}`} className="block rounded-xl -m-1 p-1 transition-colors hover:bg-[#F8FAFC]">
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Channel Breakdown" subtitle="Conversations by channel" icon={PieChart}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6" data-testid="channel-breakdown">
              {channelData.length === 0 ? (
                <EmptyState label="No channel data yet." />
              ) : (
                <>
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={channelData} cx="50%" cy="50%" innerRadius={56} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                          {channelData.map((c) => (
                            <Cell key={c.name} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[22px] font-black tracking-tight text-[#0F172A]">{fmtNum(channelTotal)}</span>
                      <span className="text-[11px] text-[#94A3B8]">total</span>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2.5">
                    {channelData.map((c) => (
                      <li key={c.name} className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-[13px] text-[#0F172A] capitalize">
                          <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                          {c.name}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[12px] text-[#94A3B8] tabular-nums">
                            {channelTotal ? Math.round((c.value / channelTotal) * 100) : 0}%
                          </span>
                          <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">{fmtNum(c.value)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* ===== Recent conversations + crawls + quick actions ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div>
          <Section title="Recent Conversations" subtitle="Latest activity" icon={MessagesSquare}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3" data-testid="recent-conversations">
              {data.conversations.length === 0 ? (
                <EmptyState label="No conversations yet." />
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {data.conversations.map((c) => (
                    <li key={c.id}>
                      <Link to={`/app/chat/${c.id}`} className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                        <span className="size-8 rounded-xl grid place-items-center bg-[#DCFCE7] flex-shrink-0">
                          <MessagesSquare size={14} className="text-[#16A34A]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0F172A] truncate">{c.title || "Untitled conversation"}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate">
                            {agentNames[c.agent_id] || "Agent"} · {fmtRelative(c.last_message_at || c.updated_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Latest Website Crawls" subtitle="Knowledge ingestion" icon={Globe}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3" data-testid="recent-crawls">
              {data.websites.length === 0 ? (
                <EmptyState label="No website crawls yet." />
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {data.websites.map((w) => (
                    <li key={w.id}>
                      <Link to="/app/websites" className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                        <span className="size-8 rounded-xl grid place-items-center bg-[#EFF6FF] flex-shrink-0">
                          <Globe size={14} className="text-[#2563EB]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0F172A] truncate">{w.name || w.base_url}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate">
                            {fmtNum(w.pages_count)} pages · {fmtRelative(w.last_crawled_at || w.updated_at)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE(w.status)}`}>
                          {w.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

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
      </div>

      {/* ===== Recent Activity + Agent Health ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <Section title="Recent Activity" subtitle="Latest changes across this project" icon={Clock}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" data-testid="recent-activity">
              {data.loading ? (
                <ul className="space-y-4 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="size-8 rounded-xl bg-[#F1F5F9]" />
                      <span className="h-3 flex-1 rounded bg-[#F1F5F9]" />
                    </li>
                  ))}
                </ul>
              ) : data.activity.length === 0 ? (
                <EmptyState label="No recent activity yet — actions you take will appear here." />
              ) : (
                <ul className="relative space-y-1">
                  {data.activity.map((ev, i) => (
                    <li key={ev.id} className="relative flex items-start gap-3 pb-1">
                      {i < data.activity.length - 1 && (
                        <span className="absolute left-4 top-9 bottom-0 w-px bg-[#E2E8F0]" />
                      )}
                      <span
                        className="size-8 rounded-xl grid place-items-center flex-shrink-0 z-10"
                        style={{ background: ev.resource.bg }}
                      >
                        <ev.resource.icon size={14} style={{ color: ev.resource.tone }} />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-[13px] text-[#0F172A]">
                          <span className="font-semibold">{ev.actor}</span> {ev.text}
                        </p>
                        <p className="text-[11px] text-[#94A3B8]">{fmtRelative(ev.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Agent Health" subtitle="Operational status at a glance" icon={Activity}>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3" data-testid="agent-health">
              {data.loading ? (
                <ul className="space-y-2 p-2 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />
                  ))}
                </ul>
              ) : data.agents.length === 0 ? (
                <EmptyState label="No agents yet — create one to monitor its health." />
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {data.agents.slice(0, 6).map((a) => {
                    const badges = agentHealthBadges(a);
                    return (
                      <li key={a.id}>
                        <Link
                          to={`/app/agents/${a.id}`}
                          className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors"
                        >
                          <span className="size-8 rounded-xl grid place-items-center bg-[#EDE9FE] flex-shrink-0">
                            <Bot size={14} className="text-[#7C3AED]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#0F172A] truncate">
                              {a.name || "Untitled agent"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {badges.map((b) => (
                                <span
                                  key={b.label}
                                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{ color: b.tone, background: b.bg }}
                                >
                                  <b.icon size={10} /> {b.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-[11px] text-[#94A3B8] flex-shrink-0">
                            {fmtRelative(a.updated_at)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* ===== This Month at a Glance ===== */}
      <Section title="This Month at a Glance" subtitle="Totals across this project · last 30 days" icon={DollarSign}>
        <div className="rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] p-6 sm:p-8 text-white relative overflow-hidden" data-testid="value-band">
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="absolute -top-12 -right-12 size-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-12 -left-12 size-64 rounded-full bg-[#60A5FA] blur-3xl" />
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {valueBand.map((r) => (
              <div key={r.label} className={r.big ? "col-span-2 sm:col-span-3 lg:col-span-1" : ""}>
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
/*  Static config + small components                                     */
/* ──────────────────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: "Create AI Agent", icon: Bot, to: "/app/create-agent", testid: "qa-create-agent" },
  { label: "Upload Document", icon: Upload, to: "/app/knowledge-base?action=upload", testid: "qa-upload-kb" },
  { label: "Crawl Website", icon: Globe, to: "/app/websites?action=crawl", testid: "qa-crawl-website" },
  { label: "Create Widget", icon: LayoutGrid, to: "/app/widgets?action=new", testid: "qa-create-widget" },
  { label: "Connect an App", icon: Plug, to: "/app/integrations", testid: "qa-connect-app" },
  { label: "Invite Member", icon: UserPlus, to: "/app/team?action=invite", testid: "qa-invite-member" },
];

/* Derive honest operational health chips for an agent from the fields we have. */
function agentHealthBadges(a) {
  const status = String(a.status || "").toLowerCase();
  const badges = [];
  if (status === "active") {
    badges.push({ label: "Running", tone: "#15803D", bg: "#DCFCE7", icon: CheckCircle2 });
  } else if (status === "paused") {
    badges.push({ label: "Paused", tone: "#B45309", bg: "#FEF3C7", icon: Pause });
  } else {
    badges.push({ label: "Draft", tone: "#475569", bg: "#F1F5F9", icon: Circle });
  }
  badges.push(
    a.is_ready
      ? { label: "Ready", tone: "#15803D", bg: "#DCFCE7", icon: CheckCircle2 }
      : { label: "Setup needed", tone: "#B45309", bg: "#FEF3C7", icon: Circle }
  );
  if (a.model) {
    badges.push({ label: a.model, tone: "#1D4ED8", bg: "#EFF6FF", icon: Zap });
  }
  return badges;
}

function KpiSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-white animate-pulse">
      <div className="size-9 rounded-xl bg-[#F1F5F9]" />
      <div className="mt-3 h-6 w-16 rounded bg-[#F1F5F9]" />
      <div className="mt-2 h-3 w-20 rounded bg-[#F1F5F9]" />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-8 text-center">
      <p className="text-sm text-[#64748B]">{label}</p>
    </div>
  );
}

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
    <th className="px-5 py-3 text-left text-[11px] font-bold tracking-wider text-[#64748B] uppercase">{children}</th>
  );
}
