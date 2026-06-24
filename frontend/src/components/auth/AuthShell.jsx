import React from "react";
import { Link } from "react-router-dom";
import { OraMark } from "@/components/marketing/Logo";
import {
  Headset,
  BookOpen,
  Users,
  ShieldCheck,
  Zap,
  Crown,
  AudioLines,
  BarChart3,
  Bot,
  Check,
  Lock,
  ArrowRight,
} from "lucide-react";

/* ── Auth brand mark (swirl + ORAONE wordmark, matches design) ── */
export function AuthBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <OraMark size={38} />
      <span className="text-[21px] font-extrabold uppercase leading-none tracking-[0.04em]">
        <span className="text-[#0F172A]">Ora</span>
        <span className="text-[#1E293B]">One</span>
      </span>
    </div>
  );
}

/* ── Brand / inline glyphs ─────────────────────────────────── */
export function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.95 1.34-.5.04-.99.22-3.34-.7-2.82-1.11-4.6-3.98-4.74-4.17-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03.96-2.31.25-.28.55-.35.73-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.38-.42.51-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.17-.19.69-.81.87-1.09.18-.28.37-.23.62-.14.25.09 1.61.76 1.89.9.28.14.46.21.53.32.07.12.07.66-.17 1.34z" />
    </svg>
  );
}

export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function Hexagon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 20.5 7v10L12 22 3.5 17V7z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ── Left-panel data ───────────────────────────────────────── */
const FEATURES = [
  { icon: Headset, tone: "violet", title: "AI Voice Agents", desc: "Human-like conversations that convert." },
  { icon: WhatsAppIcon, tone: "green", title: "WhatsApp Automation", desc: "Engage customers where they are." },
  { icon: BookOpen, tone: "blue", title: "Knowledge Base AI", desc: "Instant answers from your data." },
  { icon: Users, tone: "pink", title: "Lead Intelligence", desc: "Capture, qualify & convert leads." },
  { icon: ShieldCheck, tone: "blue", title: "Enterprise Security", desc: "Your data is safe with us." },
];

const TONES = {
  violet: "bg-[#F3F0FF] text-[#7C3AED]",
  green: "bg-[#ECFDF5] text-[#16A34A]",
  blue: "bg-[#EFF4FF] text-[#2563EB]",
  pink: "bg-[#FDF2F8] text-[#DB2777]",
  amber: "bg-[#FFF7ED] text-[#F59E0B]",
  indigo: "bg-[#EEF0FE] text-[#6366F1]",
};

const STATS = [
  { icon: ShieldCheck, tone: "indigo", value: "99.9%", label: "Uptime" },
  { icon: Zap, tone: "indigo", value: "24/7", label: "AI Availability" },
  { icon: Crown, tone: "amber", value: "Enterprise", label: "Ready" },
];

const TRUST = [
  { icon: ShieldCheck, lines: ["Protected by", "AWS Cognito"] },
  { icon: Hexagon, lines: ["SOC 2", "Ready"] },
  { icon: Lock, lines: ["256-bit", "Encryption"] },
];

/* ── Decorative conversation flow ──────────────────────────── */
function ChatFlow() {
  return (
    <div className="relative h-[300px] w-[300px]" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 300" fill="none">
        <path d="M250 40 C250 90 120 90 120 130" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M210 150 C260 160 260 210 220 220" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 5" />
      </svg>

      <div className="absolute right-6 top-0 grid size-10 place-items-center rounded-xl bg-white text-[#6366F1] shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
        <AudioLines size={18} />
      </div>

      <div className="absolute left-4 top-16 w-[190px] rounded-2xl border border-[#EEF0F6] bg-white p-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]">
        <div className="flex items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF0FE] text-[#6366F1]">
            <Bot size={15} />
          </span>
          <div>
            <p className="text-xs font-bold text-[#0F172A]">AI Agent</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">Hello! How can I help you today?</p>
          </div>
        </div>
      </div>

      <div className="absolute right-1 top-[150px] flex items-center gap-2">
        <span className="rounded-xl border border-[#EEF0F6] bg-white px-3 py-2 text-[11px] font-medium text-[#334155] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.4)]">
          Book a demo please
        </span>
        <span className="grid size-7 place-items-center rounded-full bg-[#E2E8F0] text-[#64748B]">
          <Users size={14} />
        </span>
      </div>

      <div className="absolute left-8 top-[210px] flex items-center gap-2.5 rounded-2xl border border-[#EEF0F6] bg-white p-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]">
        <div>
          <p className="text-[11px] font-semibold leading-snug text-[#0F172A]">Demo scheduled</p>
          <p className="text-[11px] leading-snug text-[#64748B]">for tomorrow at 11:00 AM</p>
        </div>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#16A34A] text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      </div>

      <div className="absolute bottom-0 right-10 grid size-10 place-items-center rounded-xl bg-white text-[#0EA5E9] shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
        <BarChart3 size={18} />
      </div>
    </div>
  );
}

/* ── Left marketing panel ──────────────────────────────────── */
function MarketingPanel() {
  return (
    <div className="relative hidden flex-col px-8 py-8 lg:flex xl:px-16 xl:py-10">
      <AuthBrand />

      <div className="flex flex-1 flex-col justify-center gap-12">
        <div className="relative">
          <div className="max-w-lg">
            <span className="inline-block rounded-full bg-[#EEEFFE] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6366F1]">
              One AI. Every Conversation
            </span>
            <h1 className="mt-4 text-[42px] font-extrabold leading-[1.04] tracking-tight text-[#0F172A] xl:text-[46px]">
              Build.
              <br />
              Automate.
              <br />
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] bg-clip-text text-transparent">
                Scale.
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#64748B]">
              OraOne helps businesses automate conversations, capture leads, and scale operations with
              advanced AI agents.
            </p>
          </div>

          <div className="pointer-events-none absolute right-0 top-0 hidden origin-top-right scale-[0.82] lg:block xl:scale-90">
            <ChatFlow />
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#EEF0F6] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.4)]">
              <span className={`grid size-10 place-items-center rounded-xl ${TONES[f.tone]}`}>
                <f.icon size={20} />
              </span>
              <p className="mt-3 text-[13px] font-bold leading-tight text-[#0F172A]">{f.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-[#94A3B8]">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#EEF0F6] bg-white px-5 py-4">
          {STATS.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <span className="h-9 w-px bg-[#EEF0F6]" />}
              <div className="flex items-center gap-2.5">
                <span className={`grid size-9 place-items-center rounded-xl ${TONES[s.tone]}`}>
                  <s.icon size={18} />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold leading-none text-[#0F172A]">{s.value}</p>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">{s.label}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

/* ── Trust badges footer (inside each card) ────────────────── */
export function TrustBadges() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#EEF0F6] pt-5">
      {TRUST.map((t) => (
        <div key={t.lines[1]} className="flex flex-col items-center gap-1.5 text-center">
          <span className="grid size-8 place-items-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
            <t.icon size={15} />
          </span>
          <p className="text-[10px] leading-tight text-[#94A3B8]">
            {t.lines[0]}
            <br />
            {t.lines[1]}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Shared right-side UI primitives ───────────────────────── */
export function IconBadge({ icon: Icon, check = false }) {
  return (
    <div className="relative mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#EEF0FE] to-[#F3EDFE]">
      <Icon size={34} className="text-[#6366F1]" />
      {check && (
        <span className="absolute -bottom-0.5 right-1 grid size-7 place-items-center rounded-full bg-[#16A34A] text-white ring-4 ring-white">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function GradientButton({ children, trailingIcon: TrailingIcon, busy = false, busyLabel, ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6A5AE0] to-[#37A5F2] py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(99,102,241,0.7)] transition-all hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? busyLabel || "Please wait..." : children}
      {!busy && TrailingIcon && (
        <TrailingIcon size={17} className="transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

export function GoogleButton({ children = "Continue with Google", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white py-3.5 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
    >
      <GoogleIcon /> {children}
    </button>
  );
}

export function OrLine() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#EEF0F6]" />
      <span className="text-xs font-semibold text-[#94A3B8]">OR</span>
      <div className="h-px flex-1 bg-[#EEF0F6]" />
    </div>
  );
}

export function OutlineButton({ children, leadingIcon: LeadingIcon = ArrowRight, to, ...props }) {
  const cls =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white py-3.5 text-sm font-semibold text-[#6366F1] transition-all hover:border-[#CBD5E1] hover:bg-[#F8FAFC]";
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {LeadingIcon && <LeadingIcon size={16} />} {children}
      </Link>
    );
  }
  return (
    <button type="button" {...props} className={cls}>
      {LeadingIcon && <LeadingIcon size={16} />} {children}
    </button>
  );
}

export function TipBox({ icon: Icon = ShieldCheck, title, children }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#F4F4FE] p-4 text-left">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#6366F1] shadow-sm">
        <Icon size={16} />
      </span>
      <p className="text-xs leading-relaxed text-[#64748B]">
        {title && <span className="font-semibold text-[#0F172A]">{title} </span>}
        {children}
      </p>
    </div>
  );
}

/* ── Shell wrapper ─────────────────────────────────────────── */
export function AuthShell({ children, cardMaxWidth = "max-w-lg", cardTestId }) {
  return (
    <div className="min-h-screen bg-[#F6F7FB]" data-testid="auth-page">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-[1.15fr_0.85fr]">
        <MarketingPanel />

        <div className="flex items-center justify-center p-6 sm:p-8 lg:border-l lg:border-[#E9ECF3] lg:shadow-[-24px_0_60px_-48px_rgba(15,23,42,0.25)]">
          <div
            data-testid={cardTestId}
            className={`w-full ${cardMaxWidth} rounded-3xl border border-[#EEF0F6] bg-white p-7 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.4)] sm:p-8`}
          >
            {children}
            <TrustBadges />
          </div>
        </div>
      </div>
    </div>
  );
}
