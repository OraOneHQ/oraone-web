import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  MessageCircle,
  Check,
  ArrowRight,
  Mail,
  MessageCircleMore,
  Calendar,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useSEO } from "@/lib/seo";
import { BrandMark } from "@/components/marketing/Logo";
import SimpleIcon from "@/components/ui/SimpleIcon";
import { ChatAgentDemo, WhatsAppAgentDemo } from "@/components/marketing/ProductLiveDemos";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

// Demo transcript for product showcase
const DEMO_TRANSCRIPT = [
  { who: "agent", time: "10:30 AM", text: "Hi! Thanks for reaching out. How can I help you today?" },
  { who: "customer", time: "10:30 AM", text: "I'd like to schedule an appointment." },
  { who: "agent", time: "10:31 AM", text: "I'd be happy to help. Let me check available time slots." },
  { who: "customer", time: "10:31 AM", text: "Tomorrow morning would be great." },
  { who: "agent", time: "10:32 AM", text: "Perfect. I've scheduled you for tomorrow at 10:00 AM." },
];

// -------- PRODUCT CARDS --------
const PRODUCTS = [
  {
    slug: "chat",
    icon: MessageSquare,
    iconBg: "#ECFDF5",
    iconColor: "#10B981",
    title: "AI Chat Agent",
    desc: "Engage website visitors in real-time. Convert visitors into customers with an intelligent chat widget.",
    features: ["Custom widget themes", "Lead qualification", "Knowledge base trained", "CRM sync"],
    preview: "chat",
  },
  {
    slug: "whatsapp",
    icon: MessageCircle,
    iconBg: "#ECFDF5",
    iconColor: "#22C55E",
    title: "WhatsApp Agent",
    desc: "Automate WhatsApp business conversations with rich media, quick replies and intelligent routing.",
    features: ["Official WhatsApp Business", "Media & buttons", "Auto reply 24/7", "Human handoff"],
    preview: "whatsapp",
  },
];

// -------- COMPARISON --------
const COMPARE_ROWS = [
  { label: "Lead Capture", c: true, w: true },
  { label: "24/7 Availability", c: true, w: true },
  { label: "Live Transcript", c: true, w: true },
  { label: "Human Handoff", c: true, w: true },
  { label: "Multi-language Support", c: true, w: true },
  { label: "CRM / Integrations", c: true, w: true },
  { label: "Appointment Booking", c: true, w: true },
  { label: "Rich Media Support", c: false, w: true },
  { label: "Official Channel", c: "Website", w: "WhatsApp" },
];

// -------- HOW IT WORKS --------
const STEPS = [
  { num: 1, icon: MessageSquare, title: "Customer Contacts You", desc: "Through chat or WhatsApp", color: "#2563EB" },
  { num: 2, icon: Activity, title: "OraOne AI Answers", desc: "Human-like conversations in real-time", color: "#06B6D4", isOra: true },
  { num: 3, icon: FileText, title: "Lead Captured & Qualified", desc: "Extracts important details and intents", color: "#8B5CF6" },
  { num: 4, icon: Calendar, title: "Action Taken Automatically", desc: "Book, route, integrate with your tools", color: "#F59E0B" },
];

// -------- INTEGRATIONS --------
const TOOL_LOGOS = [
  { name: "Google Calendar", slug: "googlecalendar", color: "#4285F4" },
  { name: "Gmail", slug: "gmail", color: "#EA4335" },
  { name: "HubSpot", slug: "hubspot", color: "#FF7A59" },
  { name: "Salesforce", slug: "salesforce", color: "#00A1E0" },
  { name: "Slack", slug: "slack", color: "#4A154B" },
  { name: "Zoho CRM", slug: "zoho", color: "#E94B3C" },
  { name: "Microsoft Teams", slug: "microsoftteams", color: "#5059C9" },
];

// -------- ROADMAP --------
const ROADMAP = [
  { name: "Email Agent", icon: Mail, color: "#EF4444", bg: "#FEF2F2" },
  { name: "SMS Agent", icon: MessageCircleMore, color: "#10B981", bg: "#ECFDF5" },
  { name: "Instagram Agent", slug: "instagram", color: "#E11D48", bg: "#FFF1F2" },
  { name: "Facebook Agent", slug: "facebook", color: "#2563EB", bg: "#EFF6FF" },
  { name: "LinkedIn Agent", slug: "linkedin", color: "#0EA5E9", bg: "#F0F9FF" },
];

export default function ProductsPage() {
  useSEO({
    title: "Products",
    description: "Explore OraOne products: AI Chat Agent and WhatsApp Agent. Powerful AI agents that automate every conversation.",
  });

  return (
    <div className="bg-white">
      {/* ============ HERO (dark) ============ */}
      <section className="relative bg-[#0F172A] text-white pt-28 pb-44 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.06]" />
        <div className="absolute -top-20 left-1/4 size-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)" }} />
        <div className="absolute -top-32 right-1/4 size-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 {...fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter">
            Explore <span className="gradient-text">OraOne</span> Products
          </motion.h1>
          <motion.p {...fadeUp} className="mt-5 text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Powerful AI agents to automate every conversation across channels.
          </motion.p>
        </div>
      </section>

      {/* ============ PRODUCT CARDS (overlap dark hero) ============ */}
      <section className="-mt-32 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {PRODUCTS.map((p, i) => (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                className="rounded-3xl bg-white border border-[#E2E8F0] shadow-premium-lg overflow-hidden flex flex-col"
              >
                <div className="p-7 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="size-11 rounded-xl grid place-items-center" style={{ background: p.iconBg }}>
                      <p.icon size={20} style={{ color: p.iconColor }} />
                    </div>
                    <div className="flex-shrink-0">
                      <ProductPreview type={p.preview} />
                    </div>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#0F172A]">{p.title}</h3>
                  <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{p.desc}</p>

                  <ul className="mt-5 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[#0F172A]">
                        <Check size={15} className="text-[#2563EB] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    data-testid={`product-card-${p.slug}-cta`}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:gap-2.5 transition-all"
                  >
                    Learn More <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ LIVE PRODUCT DEMOS ============ */}
      <ChatAgentDemo />
      <WhatsAppAgentDemo />

      {/* ============ COMPARE PRODUCTS ============ */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 sm:p-10">
            <div className="grid lg:grid-cols-4 gap-6 lg:gap-10">
              <div className="lg:col-span-1">
                <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Compare Products</h2>
                <p className="mt-3 text-sm text-[#64748B] leading-relaxed">Find the perfect agent for your business needs.</p>
              </div>

              <div className="lg:col-span-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[#E2E8F0]">
                      <th className="pb-4 font-semibold text-[#0F172A]">Features</th>
                      <th className="pb-4">
                        <div className="flex items-center justify-center gap-2 text-[#0F172A] font-semibold">
                          <MessageSquare size={14} className="text-[#10B981]" /> Chat Agent
                        </div>
                      </th>
                      <th className="pb-4">
                        <div className="flex items-center justify-center gap-2 text-[#0F172A] font-semibold">
                          <MessageCircle size={14} className="text-[#22C55E]" /> WhatsApp Agent
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {COMPARE_ROWS.map((r, i) => (
                      <tr key={i}>
                        <td className="py-3.5 font-medium text-[#0F172A]">{r.label}</td>
                        <CompareCell value={r.c} />
                        <CompareCell value={r.w} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ LIVE DEMO + HOW IT WORKS ============ */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            {/* Left: live dashboard mock */}
            <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Live agent panel (dark) */}
              <div className="sm:col-span-4 rounded-2xl bg-[#0F172A] text-white p-5 flex flex-col">
                <BrandMark size={32} className="mb-4" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold">
                    <span className="size-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                  </span>
                </div>
                <p className="text-xs text-white/55 mt-3">Live Chat Session</p>
                <p className="text-base font-bold tracking-tight font-mono mt-1">00:02:35</p>
                <nav className="mt-6 space-y-1 text-xs">
                  {[{ l: "Transcript", a: true }, { l: "Lead Details" }, { l: "Actions" }, { l: "Notes" }].map((it) => (
                    <div key={it.l} className={`px-2.5 py-2 rounded-lg ${it.a ? "bg-white/10 text-white" : "text-white/55"}`}>{it.l}</div>
                  ))}
                </nav>
                <div className="flex-1" />
                <button className="mt-5 w-full py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium inline-flex items-center justify-center gap-1.5">
                  <XCircle size={12} /> End Session
                </button>
              </div>

              {/* Live Transcript */}
              <div className="sm:col-span-4 rounded-2xl bg-white border border-[#E2E8F0] p-5">
                <p className="text-sm font-semibold text-[#0F172A] mb-4">Live Transcript</p>
                <div className="space-y-3 max-h-[280px] overflow-hidden">
                  {DEMO_TRANSCRIPT.slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`size-7 rounded-full grid place-items-center flex-shrink-0 ${m.who === "agent" ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-[#F1F5F9] text-[#475569]"}`}>
                        <span className="text-[10px] font-bold">{m.who === "agent" ? "AI" : "C"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-[#0F172A] capitalize">
                          {m.who === "agent" ? "AI Agent" : "Customer"} <span className="text-[#94A3B8] font-normal ml-1">{m.time}</span>
                        </p>
                        <p className="text-xs text-[#475569] mt-0.5 leading-snug">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-[#94A3B8] flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500" /> Live · 5 messages</p>
              </div>

              {/* Lead Captured */}
              <div className="sm:col-span-4 rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col">
                <p className="text-sm font-semibold text-[#0F172A] mb-4">Lead Captured</p>
                <div className="space-y-3 text-xs flex-1">
                  <LeadField label="Name" value="Rahul Sharma" />
                  <LeadField label="Phone" value="+91 98765 43210" />
                  <LeadField label="Email" value="rahul.sharma@email.com" />
                  <LeadField label="Intent" value="Book Appointment" />
                  <div>
                    <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider">Sentiment</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-green-600 font-semibold"><span className="size-1.5 rounded-full bg-green-500" /> Positive</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider">Lead Score</p>
                    <p className="text-base font-bold text-[#0F172A] mt-0.5">92 <span className="text-[#94A3B8] text-xs font-normal">/ 100</span></p>
                  </div>
                </div>
                <button className="mt-4 w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold">View Lead</button>
              </div>
            </motion.div>

            {/* Right: How It Works + tools */}
            <motion.div {...fadeUp}>
              <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">How It Works</h2>
              <p className="mt-2 text-sm text-[#64748B]">Simple steps. Powerful results.</p>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STEPS.map((s, idx) => (
                  <React.Fragment key={s.num}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      className="text-center"
                    >
                      <div className="mx-auto size-14 rounded-2xl grid place-items-center mb-3 relative" style={{ background: s.isOra ? "transparent" : `${s.color}15` }}>
                        {s.isOra ? (
                          <BrandMark size={48} />
                        ) : (
                          <s.icon size={20} style={{ color: s.color }} />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#0F172A] leading-tight">{s.title}</p>
                      <p className="mt-1 text-[10px] text-[#64748B] leading-snug">{s.desc}</p>
                    </motion.div>
                  </React.Fragment>
                ))}
              </div>

              {/* Tools strip */}
              <div className="mt-10">
                <p className="text-center text-sm font-semibold text-[#0F172A]">Works With Your Favorite Tools</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {TOOL_LOGOS.map((t) => (
                    <div key={t.name} className="size-11 rounded-xl bg-white border border-[#E2E8F0] grid place-items-center" title={t.name}>
                      <SimpleIcon slug={t.slug} size={20} color={t.color} title={t.name} />
                    </div>
                  ))}
                  <div className="size-11 rounded-xl bg-white border border-[#E2E8F0] grid place-items-center text-[#94A3B8]">
                    <span className="text-lg leading-none">···</span>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-[#64748B]">and more...</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ FUTURE AGENTS ROADMAP ============ */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="rounded-3xl bg-white border border-[#E2E8F0] p-7 sm:p-10">
            <div className="grid lg:grid-cols-4 gap-6 lg:gap-10 items-center">
              <div className="lg:col-span-1">
                <h3 className="text-xl font-bold tracking-tight text-[#0F172A] leading-tight">
                  Future Agents<br />Roadmap 2026
                </h3>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">We're building more agents to cover all your channels.</p>
              </div>
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ROADMAP.map((r) => (
                  <div key={r.name} className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2.5" data-testid={`roadmap-${r.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="size-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: r.bg }}>
                      {r.slug ? (
                        <SimpleIcon slug={r.slug} size={16} color={r.color} title={r.name} />
                      ) : (
                        <r.icon size={16} style={{ color: r.color }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] truncate">{r.name}</p>
                      <p className="text-[10px] text-[#64748B]">Coming Soon</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="relative rounded-3xl overflow-hidden p-8 sm:p-10 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)" }}>
            <div className="absolute -top-20 -left-20 size-72 rounded-full bg-white/10" />
            <div className="absolute -bottom-32 -right-20 size-96 rounded-full bg-white/5" />
            <div className="relative grid lg:grid-cols-12 items-center gap-6">
              <div className="lg:col-span-2 flex justify-center lg:justify-start">
                <div className="size-24 rounded-full bg-white/10 grid place-items-center backdrop-blur-sm">
                  <BrandMark size={56} />
                </div>
              </div>
              <div className="lg:col-span-6">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to automate every conversation?</h3>
                <p className="mt-2 text-sm text-white/80">Join thousands of businesses using OraOne AI agents to save time, capture more leads and grow faster.</p>
              </div>
              <div className="lg:col-span-4 flex flex-wrap gap-3 lg:justify-end">
                <Link to="/signup" data-testid="products-cta-start-free" className="px-5 py-3 rounded-xl bg-white hover:bg-white/90 text-[#2563EB] font-semibold text-sm">Start Free Beta</Link>
                <Link to="/contact" data-testid="products-cta-book-demo" className="px-5 py-3 rounded-xl border border-white/30 hover:bg-white/10 font-semibold text-sm">Book a Demo</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Helper components ---------- */

function CompareCell({ value }) {
  if (typeof value === "string") {
    return <td className="py-3.5 text-center text-sm text-[#475569]">{value}</td>;
  }
  return (
    <td className="py-3.5 text-center">
      {value ? (
        <CheckCircle2 size={18} className="inline-block text-green-500" />
      ) : (
        <span className="inline-block w-4 h-px bg-[#CBD5E1]" />
      )}
    </td>
  );
}

function LeadField({ label, value }) {
  return (
    <div>
      <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-[#0F172A] font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}

/* ---------- Product card preview thumbnails ---------- */
function ProductPreview({ type }) {
  if (type === "chat") {
    return (
      <div className="w-32 sm:w-36 rounded-2xl bg-white p-2 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-[#E2E8F0]">
          <p className="text-[9px] font-semibold text-[#0F172A]">Chat with us</p>
          <span className="text-[8px] text-green-600 font-medium flex items-center gap-0.5"><span className="size-1 rounded-full bg-green-500" /> Online</span>
        </div>
        <div className="space-y-1.5 text-[8px]">
          <div className="inline-block px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#0F172A]">Hi! How can I help?</div>
          <div className="text-right"><div className="inline-block px-2 py-1 rounded-lg bg-[#22C55E] text-white">Pricing options</div></div>
          <div className="inline-block px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#0F172A]">Sure! Here you go...</div>
        </div>
      </div>
    );
  }
  // WhatsApp
  return (
    <div className="w-32 sm:w-36 rounded-2xl bg-[#E8F5E9] p-2 border border-[#E2E8F0]">
      <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-[#22C55E]/20">
        <div className="size-5 rounded-full bg-[#22C55E] grid place-items-center text-white"><MessageCircle size={10} /></div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold text-[#0F172A] truncate">OraOne Business</p>
          <p className="text-[8px] text-green-600">Online</p>
        </div>
      </div>
      <div className="space-y-1 text-[8px]">
        <div className="inline-block px-2 py-1 rounded-lg bg-white text-[#0F172A]">Welcome! 👋</div>
        <div className="text-right"><div className="inline-block px-2 py-1 rounded-lg bg-[#DCF8C6] text-[#0F172A]">Book appointment</div></div>
        <div className="rounded-lg bg-white px-2 py-1 text-[#0F172A]">Date & time?</div>
      </div>
    </div>
  );
}
