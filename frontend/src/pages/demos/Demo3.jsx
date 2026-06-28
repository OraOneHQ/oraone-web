import React from "react";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  BookOpen,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  Check,
  Zap,
} from "lucide-react";
import DemoSwitcher from "./DemoSwitcher";

/**
 * DESIGN DIRECTION 3 — "Electric Enterprise"
 * Bold, high-contrast, confident (Mercury / Stripe / modern fintech energy).
 * Crisp white + ink black, electric violet accent, strong type, structured
 * grid with bold color blocks and sharp edges.
 */

const INK = "#0A0A0B";
const VOLT = "#6D28D9"; // electric violet
const VOLT_LIGHT = "#7C3AED";

const FEATURES = [
  { icon: Phone, title: "Voice Agent", desc: "Human-grade phone agents that never miss a call." },
  { icon: MessageSquare, title: "Chat Agent", desc: "Sub-second on-site answers that convert." },
  { icon: MessageCircle, title: "WhatsApp", desc: "Automate the channel customers actually use." },
  { icon: BookOpen, title: "Knowledge Base", desc: "Grounded, cited answers from your sources." },
  { icon: Users, title: "Lead Capture", desc: "Score and route leads the moment they arrive." },
  { icon: BarChart3, title: "Analytics", desc: "Pipeline impact, sentiment and intent — live." },
];

export default function Demo3() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-[#0A0A0B] antialiased">
      <DemoSwitcher />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-24 pb-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md text-white" style={{ background: INK }}>
            <Zap size={18} style={{ color: "#A78BFA" }} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">OraOne</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#3F3F46] md:flex">
          <a className="transition hover:text-[#0A0A0B]" href="#">Product</a>
          <a className="transition hover:text-[#0A0A0B]" href="#">Solutions</a>
          <a className="transition hover:text-[#0A0A0B]" href="#">Pricing</a>
          <a className="transition hover:text-[#0A0A0B]" href="#">Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="hidden text-sm font-semibold text-[#3F3F46] transition hover:text-[#0A0A0B] sm:block">Sign in</button>
          <button
            className="rounded-md px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: INK }}
          >
            Start now
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <div className="grid items-end gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: VOLT }}
            >
              <Zap size={13} /> Enterprise-grade AI
            </div>
            <h1 className="mt-6 text-6xl font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-7xl md:text-8xl">
              One AI.
              <br />
              Every
              <span className="relative ml-3 inline-block">
                <span className="relative z-10" style={{ color: VOLT }}>conversation.</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-4" style={{ background: "#EDE4FF" }} />
              </span>
            </h1>
          </div>
          <div className="lg:pb-3">
            <p className="text-lg font-medium leading-relaxed text-[#3F3F46]">
              Voice, Chat and WhatsApp agents that answer every call, reply
              instantly, and convert more leads — 24/7.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: INK }}
              >
                Start free <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border-2 px-6 py-3.5 text-sm font-bold transition hover:bg-[#FAFAFA]"
                style={{ borderColor: INK }}
              >
                Book demo
              </button>
            </div>
          </div>
        </div>

        {/* Bold dashboard block */}
        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          {/* Big stat block */}
          <div className="rounded-2xl p-8 text-white lg:row-span-2" style={{ background: INK }}>
            <p className="text-sm font-semibold text-white/50">Leads converted this quarter</p>
            <div className="mt-3 text-6xl font-extrabold tracking-tight">+218%</div>
            <p className="mt-2 text-sm text-white/60">vs. last quarter, fully automated</p>
            <div className="mt-8 h-px w-full bg-white/10" />
            <div className="mt-6 flex items-end gap-2">
              {[30, 45, 38, 60, 52, 78, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}px`, background: i >= 5 ? "#A78BFA" : "rgba(255,255,255,0.18)" }} />
              ))}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Real-time sync active
            </div>
          </div>

          {/* Volt block */}
          <div className="rounded-2xl p-8 text-white" style={{ background: VOLT_LIGHT }}>
            <BarChart3 size={22} />
            <div className="mt-6 text-4xl font-extrabold">99.9%</div>
            <p className="mt-1 text-sm font-medium text-white/80">Uptime, enterprise SLA-backed</p>
          </div>

          {/* Outline block */}
          <div className="rounded-2xl border-2 border-[#0A0A0B] p-8">
            <Users size={22} style={{ color: VOLT }} />
            <div className="mt-6 text-4xl font-extrabold">10,000+</div>
            <p className="mt-1 text-sm font-medium text-[#3F3F46]">Businesses run on OraOne</p>
          </div>

          {/* Two small blocks under volt/outline */}
          <div className="rounded-2xl bg-[#F4F4F5] p-8">
            <Phone size={22} style={{ color: VOLT }} />
            <div className="mt-6 text-4xl font-extrabold">0.9s</div>
            <p className="mt-1 text-sm font-medium text-[#3F3F46]">Average response time</p>
          </div>
          <div className="rounded-2xl bg-[#F4F4F5] p-8">
            <MessageSquare size={22} style={{ color: VOLT }} />
            <div className="mt-6 text-4xl font-extrabold">1.2M</div>
            <p className="mt-1 text-sm font-medium text-[#3F3F46]">Conversations handled / mo</p>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="mx-auto mt-20 max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-6 border-y-2 border-[#0A0A0B] py-6">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#71717A]">Trusted by teams at</span>
          {["NORTHWIND", "ACME", "GLOBEX", "INITECH", "UMBRELLA"].map((n) => (
            <span key={n} className="text-lg font-extrabold tracking-tight text-[#0A0A0B]">{n}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <h2 className="max-w-xl text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-5xl">
            Built for scale.<br />Tuned for revenue.
          </h2>
          <p className="max-w-xs text-[#3F3F46]">
            Every capability you need to deploy AI across the entire customer journey.
          </p>
        </div>
        <div className="mt-12 grid border-l-2 border-t-2 border-[#0A0A0B] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative border-b-2 border-r-2 border-[#0A0A0B] p-8 transition hover:bg-[#0A0A0B]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-md border-2 border-[#0A0A0B] transition group-hover:border-white" style={{ background: "transparent" }}>
                <f.icon size={22} className="text-[#0A0A0B] transition group-hover:text-white" style={{ color: undefined }} />
              </span>
              <h3 className="mt-6 text-xl font-extrabold transition group-hover:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#3F3F46] transition group-hover:text-white/70">{f.desc}</p>
              <ArrowUpRight size={18} className="absolute right-6 top-6 text-[#D4D4D8] transition group-hover:text-[#A78BFA]" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl p-12 text-white sm:p-16" style={{ background: INK }}>
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <h2 className="text-4xl font-extrabold leading-tight tracking-[-0.02em] sm:text-5xl">
                Deploy your first agent<br />
                <span style={{ color: "#A78BFA" }}>this afternoon.</span>
              </h2>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                <span className="inline-flex items-center gap-1.5"><Check size={15} style={{ color: "#A78BFA" }} /> No code required</span>
                <span className="inline-flex items-center gap-1.5"><Check size={15} style={{ color: "#A78BFA" }} /> 14-day trial</span>
                <span className="inline-flex items-center gap-1.5"><Check size={15} style={{ color: "#A78BFA" }} /> SOC 2 Type II</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-4 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: VOLT_LIGHT }}
              >
                Start free <ArrowRight size={16} />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-white/30 px-6 py-4 text-sm font-bold transition hover:bg-white/10">
                Talk to sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
