import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  MessageCircle,
  Copy,
  Check,
  ArrowDown,
  Send,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────── */
/*  Chat Agent demo                                                     */
/* ──────────────────────────────────────────────────────────────────── */
const CHAT_TRANSCRIPT = [
  { who: "customer", text: "I want pricing." },
  { who: "ai", text: "Sure! Which plan are you interested in — Starter, Growth or Enterprise?" },
  { who: "customer", text: "Growth." },
  { who: "ai", text: "The Growth plan is ₹14,999/mo · unlimited agents, 25k conversations & priority support. Want me to book a quick call?" },
];

export function ChatAgentDemo() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step >= CHAT_TRANSCRIPT.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1300);
    return () => clearTimeout(t);
  }, [step]);

  const snippet = `<script src="https://oraone.in/widget.js" data-widget-id="wgt_your_public_key" async></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard unavailable */ }
  };

  return (
    <section className="py-20" data-testid="chat-demo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[11px] font-bold tracking-[0.2em] text-[#2563EB]">
            <MessageSquare size={11} /> CHAT AGENT IN ACTION
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
            See your website chat convert.
          </h2>
          <p className="mt-2 text-[#64748B]">Live widget, one-line install and the funnel that turns visitors into customers.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Website mock with chat widget */}
          <div className="min-w-0 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 relative overflow-hidden min-h-[420px]">
            {/* fake site header */}
            <div className="flex items-center gap-1.5 mb-4">
              <span className="size-2.5 rounded-full bg-[#EF4444]" />
              <span className="size-2.5 rounded-full bg-[#F59E0B]" />
              <span className="size-2.5 rounded-full bg-[#10B981]" />
              <p className="ml-2 text-[11px] text-[#94A3B8] font-mono">acme.com</p>
            </div>
            <div className="space-y-2">
              <div className="h-6 w-2/3 rounded-md bg-[#E2E8F0]" />
              <div className="h-3 w-full rounded-md bg-[#E2E8F0]/70" />
              <div className="h-3 w-5/6 rounded-md bg-[#E2E8F0]/70" />
              <div className="h-3 w-3/4 rounded-md bg-[#E2E8F0]/70" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-white border border-[#E2E8F0]" />
              ))}
            </div>

            {/* Chat widget */}
            <div className="absolute bottom-5 right-5 w-[calc(100%-2.5rem)] max-w-[300px] rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#2563EB] text-white flex items-center gap-2">
                <span className="size-7 rounded-full bg-white/20 grid place-items-center text-[11px] font-bold">O</span>
                <div className="flex-1">
                  <p className="text-[12px] font-bold">OraOne Assistant</p>
                  <p className="text-[10px] text-white/80">Online · replies instantly</p>
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {CHAT_TRANSCRIPT.slice(0, step).map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.who === "ai" ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-[12px] ${
                      m.who === "ai" ? "bg-[#F1F5F9] text-[#0F172A]" : "bg-[#2563EB] text-white"
                    }`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-[#E2E8F0] flex items-center gap-1.5">
                <input
                  placeholder="Type a message…"
                  className="flex-1 text-[12px] px-2 py-1.5 rounded-lg bg-[#F8FAFC] outline-none"
                  tabIndex={-1}
                  aria-hidden="true"
                  readOnly
                />
                <button className="size-7 rounded-lg bg-[#2563EB] grid place-items-center text-white">
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Install + funnel */}
          <div className="min-w-0 space-y-6">
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6" data-testid="chat-snippet">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#2563EB] mb-2">WIDGET INSTALLATION</p>
              <p className="text-[13px] text-[#475569] mb-3">Paste this line before <code className="font-mono text-[#0F172A]">{'</body>'}</code> on your site.</p>
              <div className="relative min-w-0 rounded-xl bg-[#0F172A] border border-[#1E293B] p-3.5">
                <pre className="min-w-0 text-[11.5px] text-[#E2E8F0] font-mono overflow-x-auto">{snippet}</pre>
                <button
                  onClick={copy}
                  data-testid="chat-snippet-copy"
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] text-white/80 hover:text-white hover:bg-white/10"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6">
              <p className="text-[11px] font-bold tracking-[0.2em] text-[#2563EB] mb-3">LEAD CAPTURE FLOW</p>
              <div className="space-y-2">
                {["Website Visitor", "AI Conversation", "Lead Captured", "Dashboard"].map((s, i, arr) => (
                  <React.Fragment key={s}>
                    <div className="px-3.5 py-3 rounded-xl bg-gradient-to-r from-[#EFF6FF] to-white border border-[#E0E7FF] text-[13.5px] font-semibold text-[#0F172A] flex items-center gap-2">
                      <span className="size-6 rounded-full bg-[#2563EB] text-white text-[10px] font-bold grid place-items-center">
                        {i + 1}
                      </span>
                      {s}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown size={14} className="text-[#94A3B8]" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  WhatsApp Agent demo                                                 */
/* ──────────────────────────────────────────────────────────────────── */
const WA_TRANSCRIPT = [
  { who: "customer", text: "Need an appointment.", time: "10:14 AM" },
  { who: "ai", text: "Hi! Which location works best — Kondapur, Madhapur or Banjara Hills?", time: "10:14 AM" },
  { who: "customer", text: "Kondapur.", time: "10:15 AM" },
  { who: "ai", text: "Available slots: 11:00 AM, 2:30 PM, 4:00 PM tomorrow.", time: "10:15 AM" },
  { who: "customer", text: "2:30 PM.", time: "10:16 AM" },
  { who: "ai", text: "Booked ✅ See you tomorrow at 2:30 PM. We've added it to your calendar.", time: "10:16 AM" },
];

export function WhatsAppAgentDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= WA_TRANSCRIPT.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1200);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <section className="py-20 bg-gradient-to-b from-[#F8FAFC] via-white to-white" data-testid="whatsapp-demo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[11px] font-bold tracking-[0.2em] text-[#15803D]">
            <MessageCircle size={11} /> WHATSAPP AGENT IN ACTION
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
            Conversations that feel like a real teammate.
          </h2>
          <p className="mt-2 text-[#64748B]">Native WhatsApp UX, instant replies and a business dashboard built for scale.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Phone mock */}
          <div className="min-w-0 lg:col-span-2 flex justify-center">
            <div className="w-[280px] rounded-[36px] bg-[#0F172A] p-2.5 shadow-2xl">
              <div className="rounded-[28px] bg-[#075E54] overflow-hidden">
                {/* notch */}
                <div className="flex justify-center pt-2">
                  <span className="h-1 w-16 rounded-full bg-black/50" />
                </div>
                {/* header */}
                <div className="px-3 py-2.5 flex items-center gap-2 text-white">
                  <span className="size-8 rounded-full bg-white/20 grid place-items-center text-[12px] font-bold">D</span>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold">Dental Clinic AI</p>
                    <p className="text-[10px] text-white/70">online</p>
                  </div>
                </div>
                {/* conversation */}
                <div className="bg-[#E5DDD5] p-3 min-h-[380px] space-y-2">
                  {WA_TRANSCRIPT.slice(0, step).map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.who === "ai" ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-[12px] shadow-sm ${
                        m.who === "ai" ? "bg-white text-[#0F172A]" : "bg-[#DCF8C6] text-[#0F172A]"
                      }`}>
                        {m.text}
                        <p className="text-[9px] text-[#94A3B8] mt-0.5 text-right">{m.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Business dashboard */}
          <div className="min-w-0 lg:col-span-3" data-testid="wa-dashboard">
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-bold text-[#0F172A]">WhatsApp Business Dashboard</p>
                  <p className="text-[11.5px] text-[#64748B]">Live · last 24 hours</p>
                </div>
                <span className="text-[10.5px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">VERIFIED</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Active Conversations" value="42" tone="#16A34A" />
                <Stat label="Response Rate" value="98%" tone="#2563EB" />
                <Stat label="Leads Generated" value="18" tone="#7C3AED" />
                <Stat label="Appointments Booked" value="9" tone="#F59E0B" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Mini label="Templates" value="12" sub="Approved" />
                <Mini label="Avg Reply" value="3s" sub="Median" />
                <Mini label="CSAT" value="4.8" sub="★ rating" />
              </div>
              <div className="mt-5 rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#16A34A] mb-2">RECENT MESSAGES</p>
                <ul className="space-y-2">
                  {[
                    { name: "Aarav M.", msg: "Need an appointment.", time: "now" },
                    { name: "Sneha I.", msg: "What are your charges?", time: "2m" },
                    { name: "Rahul S.", msg: "Got the confirmation, thanks!", time: "5m" },
                  ].map((m) => (
                    <li key={m.name} className="flex items-center gap-2.5">
                      <span className="size-8 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold grid place-items-center">
                        {m.name[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#0F172A]">{m.name}</p>
                        <p className="text-[11.5px] text-[#64748B] truncate">{m.msg}</p>
                      </div>
                      <span className="text-[10.5px] text-[#94A3B8]">{m.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
function Stat({ label, value, tone }) {
  return (
    <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
      <p className="text-[10.5px] text-[#64748B] uppercase tracking-wider font-semibold">{label}</p>
      <p className="mt-1 text-base font-black" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function Mini({ label, value, sub }) {
  return (
    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
      <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-lg font-black text-[#0F172A] mt-0.5">{value}</p>
      <p className="text-[10px] text-[#94A3B8]">{sub}</p>
    </div>
  );
}
