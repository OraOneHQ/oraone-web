import React from "react";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
  Check,
  Star,
  Play,
  ShieldCheck,
} from "lucide-react";
import DemoSwitcher from "./DemoSwitcher";

/**
 * DESIGN DIRECTION 1 — "Midnight Aurora"
 * Dark, premium, modern-SaaS aesthetic (Linear / Vercel / Framer energy).
 * Deep navy canvas, glassmorphism, aurora gradient glow, neon accents.
 */

const FEATURES = [
  { icon: Phone, title: "Voice Agent", desc: "Answers every call with a natural human voice — 24/7, no hold music.", tint: "#6366F1" },
  { icon: MessageSquare, title: "Chat Agent", desc: "Instant on-site replies that qualify and convert visitors.", tint: "#22D3EE" },
  { icon: MessageCircle, title: "WhatsApp", desc: "Meet customers where they already are, on the world's #1 app.", tint: "#34D399" },
  { icon: BookOpen, title: "Knowledge Base", desc: "Grounded answers from your own docs, sites and policies.", tint: "#A78BFA" },
  { icon: Users, title: "Lead Capture", desc: "Turn conversations into qualified, scored leads automatically.", tint: "#F472B6" },
  { icon: BarChart3, title: "Analytics", desc: "See sentiment, intent and revenue impact in real time.", tint: "#FBBF24" },
];

const STATS = [
  { k: "99.9%", v: "Uptime SLA" },
  { k: "24/7", v: "Always on" },
  { k: "4.9/5", v: "Customer rating" },
  { k: "10k+", v: "Businesses" },
];

export default function Demo1() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#070A12] text-white antialiased">
      <DemoSwitcher />

      {/* Aurora background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.45),transparent)] blur-2xl" />
        <div className="absolute top-24 -right-40 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.30),transparent)] blur-2xl" />
        <div className="absolute top-[520px] -left-40 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.28),transparent)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-24 pb-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_24px_rgba(99,102,241,0.6)]">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">OraOne</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a className="transition hover:text-white" href="#">Product</a>
            <a className="transition hover:text-white" href="#">Solutions</a>
            <a className="transition hover:text-white" href="#">Pricing</a>
            <a className="transition hover:text-white" href="#">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="hidden text-sm font-medium text-white/70 transition hover:text-white sm:block">Sign in</button>
            <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#070A12] transition hover:bg-white/90">
              Start free
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            New · GPT-5.5 powered voice
          </div>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            One AI.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
              Every conversation.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Voice, Chat and WhatsApp agents that answer every call, reply
            instantly and convert more leads — around the clock.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-semibold shadow-[0_8px_40px_rgba(99,102,241,0.5)] transition hover:shadow-[0_8px_50px_rgba(99,102,241,0.7)]">
              Start building free
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/10">
              <Play size={15} /> Watch demo
            </button>
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="absolute inset-x-12 -top-6 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="rounded-[20px] border border-white/10 bg-[#0B0F1C]/80 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 size={16} className="text-cyan-300" /> Live Dashboard
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
                  </span>
                </div>
                <div className="grid gap-4 pt-5 md:grid-cols-3">
                  {/* Metric cards */}
                  <div className="space-y-4 md:col-span-1">
                    {[
                      { l: "Conversations", n: "1,284", up: "+12%" },
                      { l: "Leads captured", n: "342", up: "+8%" },
                      { l: "Avg. response", n: "0.9s", up: "−40%" },
                    ].map((m) => (
                      <div key={m.l} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                        <p className="text-xs text-white/50">{m.l}</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{m.n}</span>
                          <span className="text-xs font-semibold text-emerald-300">{m.up}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chart */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Conversations this week</p>
                      <span className="text-xs text-white/40">Mon–Sun</span>
                    </div>
                    <div className="mt-6 flex h-40 items-end gap-3">
                      {[42, 58, 47, 72, 63, 88, 96].map((h, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500/40 to-cyan-400"
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[10px] text-white/40">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto mt-24 max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.v} className="bg-[#070A12] px-6 py-8 text-center">
                <div className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent">
                  {s.k}
                </div>
                <div className="mt-1 text-sm text-white/50">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto mt-28 max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your agent needs
            </h2>
            <p className="mt-4 text-white/55">
              One platform for every channel — composable, grounded and built to convert.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                  style={{ background: f.tint }}
                />
                <span
                  className="relative grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: `${f.tint}1f`, border: `1px solid ${f.tint}55` }}
                >
                  <f.icon size={20} style={{ color: f.tint }} />
                </span>
                <h3 className="relative mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-28 max-w-6xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-[#0B0F1C] to-cyan-600/20 p-12 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.6),transparent)] blur-2xl" />
            </div>
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Launch your first AI agent in minutes
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/60">
                No credit card. No code. Just connect a channel and go live.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#070A12] transition hover:bg-white/90">
                  Start free <ArrowRight size={16} />
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  Talk to sales
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-300" /> 14-day free trial</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-cyan-300" /> SOC 2 Type II</span>
                <span className="inline-flex items-center gap-1.5"><Star size={14} className="text-amber-300" /> 4.9/5 on G2</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
