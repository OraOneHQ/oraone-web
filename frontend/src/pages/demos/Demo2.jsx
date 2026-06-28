import React from "react";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
  Check,
  Star,
  Sparkles,
  Heart,
} from "lucide-react";
import DemoSwitcher from "./DemoSwitcher";

/**
 * DESIGN DIRECTION 2 — "Soft Daylight"
 * Warm, friendly, approachable (Notion / Intercom / Stripe-light energy).
 * Cream canvas, teal primary + coral accent, soft rounded cards, gentle shadows.
 */

const TEAL = "#0F9488";
const CORAL = "#F97362";

const FEATURES = [
  { icon: Phone, title: "Voice Agent", desc: "A warm, human voice that answers every call — day or night.", bg: "#E6F4F1", fg: "#0F9488" },
  { icon: MessageSquare, title: "Chat Agent", desc: "Friendly on-site replies that help and gently convert.", bg: "#FFF0EE", fg: "#F97362" },
  { icon: MessageCircle, title: "WhatsApp", desc: "Reach customers on the app they check all day long.", bg: "#FEF3E2", fg: "#D97706" },
  { icon: BookOpen, title: "Knowledge Base", desc: "Answers grounded in your own docs, sites and policies.", bg: "#EEF2FF", fg: "#6366F1" },
  { icon: Users, title: "Lead Capture", desc: "Every chat becomes a tidy, qualified lead automatically.", bg: "#F3EEFE", fg: "#8B5CF6" },
  { icon: BarChart3, title: "Analytics", desc: "Clear, calm insights into what your customers really want.", bg: "#E7F6EC", fg: "#16A34A" },
];

const STATS = [
  { k: "99.9%", v: "Uptime" },
  { k: "24/7", v: "Always on" },
  { k: "4.9/5", v: "Loved by users" },
  { k: "10k+", v: "Happy teams" },
];

export default function Demo2() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FBF8F3] text-[#1C2B2D] antialiased">
      <DemoSwitcher />

      <div className="relative">
        {/* Soft blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#CDEBE5] opacity-50 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-[#FFE0DB] opacity-60 blur-3xl" />
        </div>

        {/* Nav */}
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-24 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-2xl text-white shadow-sm"
              style={{ background: TEAL }}
            >
              <Sparkles size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight">OraOne</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#5B6B6C] md:flex">
            <a className="transition hover:text-[#1C2B2D]" href="#">Product</a>
            <a className="transition hover:text-[#1C2B2D]" href="#">Solutions</a>
            <a className="transition hover:text-[#1C2B2D]" href="#">Pricing</a>
            <a className="transition hover:text-[#1C2B2D]" href="#">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="hidden text-sm font-semibold text-[#5B6B6C] transition hover:text-[#1C2B2D] sm:block">Sign in</button>
            <button
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(15,148,136,0.5)] transition hover:brightness-105"
              style={{ background: TEAL }}
            >
              Get started
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 lg:grid-cols-2">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
              style={{ background: "#FFF0EE", borderColor: "#FFD8D2", color: CORAL }}
            >
              <Heart size={13} /> Customers love it
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              One AI for{" "}
              <span style={{ color: TEAL }}>every</span> conversation.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[#5B6B6C]">
              Voice, Chat and WhatsApp agents that answer every call, reply
              instantly and turn more visitors into customers — kindly, 24/7.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(15,148,136,0.55)] transition hover:brightness-105"
                style={{ background: TEAL }}
              >
                Start free <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-[#DCD6CC] bg-white px-6 py-3.5 text-sm font-semibold text-[#1C2B2D] transition hover:bg-[#FBF8F3]">
                Book a demo
              </button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#0F9488", "#F97362", "#D97706", "#8B5CF6"].map((c) => (
                  <span key={c} className="h-8 w-8 rounded-full border-2 border-[#FBF8F3]" style={{ background: c }} />
                ))}
              </div>
              <div className="text-sm text-[#5B6B6C]">
                <span className="font-semibold text-[#1C2B2D]">10,000+ teams</span> onboard this month
              </div>
            </div>
          </div>

          {/* Chat card visual */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-[#CDEBE5] to-[#FFE0DB] opacity-60 blur-2xl" />
            <div className="relative rounded-[28px] border border-[#EDE7DC] bg-white p-5 shadow-[0_30px_60px_-24px_rgba(28,43,45,0.25)]">
              <div className="flex items-center gap-3 border-b border-[#F0EBE2] pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: TEAL }}>
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">Ora Assistant</p>
                  <p className="text-xs text-[#7C8A8B]">Online · replies instantly</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EC] px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Live
                </span>
              </div>
              <div className="space-y-3 py-5">
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-[#F3F1EA] px-4 py-2.5 text-sm text-[#1C2B2D]">
                  Hi! Do you have availability this weekend?
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white" style={{ background: TEAL }}>
                  We do! I can book you Saturday 10am or Sunday 2pm. Which works best? 😊
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-[#F3F1EA] px-4 py-2.5 text-sm text-[#1C2B2D]">
                  Saturday 10am, please.
                </div>
                <div className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[#FFF0EE] px-4 py-2.5 text-sm font-medium" style={{ color: CORAL }}>
                  <Check size={15} /> Booked — confirmation sent on WhatsApp
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#EDE7DC] bg-[#FBF8F3] px-4 py-2.5">
                <input
                  disabled
                  placeholder="Type a message…"
                  className="flex-1 bg-transparent text-sm text-[#5B6B6C] outline-none"
                />
                <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: CORAL }}>
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="relative mx-auto mt-24 max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.v} className="rounded-3xl border border-[#EDE7DC] bg-white px-6 py-7 text-center shadow-[0_10px_30px_-18px_rgba(28,43,45,0.3)]">
                <div className="text-3xl font-bold" style={{ color: TEAL }}>{s.k}</div>
                <div className="mt-1 text-sm text-[#5B6B6C]">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="relative mx-auto mt-28 max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: CORAL }}>Features</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Warm by design, powerful underneath
            </h2>
            <p className="mt-4 text-[#5B6B6C]">
              Everything you need to delight customers across every channel.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-[#EDE7DC] bg-white p-7 shadow-[0_10px_30px_-22px_rgba(28,43,45,0.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-26px_rgba(28,43,45,0.4)]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: f.bg }}>
                  <f.icon size={22} style={{ color: f.fg }} />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5B6B6C]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto mt-28 max-w-6xl px-6 pb-24">
          <div className="overflow-hidden rounded-[32px] border border-[#EDE7DC] bg-white p-12 text-center shadow-[0_30px_70px_-40px_rgba(28,43,45,0.5)]">
            <div className="mx-auto h-14 w-14 place-items-center rounded-2xl" style={{ display: "grid", background: "#E6F4F1" }}>
              <Star size={26} style={{ color: TEAL }} />
            </div>
            <h2 className="mx-auto mt-6 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to give every customer a warm welcome?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[#5B6B6C]">
              Set up your first agent in minutes. No code, no credit card.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(15,148,136,0.55)] transition hover:brightness-105"
                style={{ background: TEAL }}
              >
                Start free <ArrowRight size={16} />
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-[#DCD6CC] px-7 py-3.5 text-sm font-semibold text-[#1C2B2D] transition hover:bg-[#FBF8F3]">
                Talk to us
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
