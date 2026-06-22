import React, { useState } from "react";
import {
  User,
  Lock,
  Bell,
  KeyRound,
  CreditCard,
  Users,
  ShieldCheck,
  Save,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const TABS = [
  { id: "profile",       icon: User,        label: "Profile",       desc: "Update your personal information" },
  { id: "password",      icon: Lock,        label: "Password",      desc: "Change your password" },
  { id: "notifications", icon: Bell,        label: "Notifications", desc: "Manage your notifications" },
  { id: "api",           icon: KeyRound,    label: "API Keys",      desc: "Manage API keys" },
  { id: "billing",       icon: CreditCard,  label: "Billing",       desc: "Manage billing and subscriptions" },
  { id: "team",          icon: Users,       label: "Team",          desc: "Manage team members" },
  { id: "security",      icon: ShieldCheck, label: "Security",      desc: "Two-factor authentication" },
];

export default function Settings() {
  const [active, setActive] = useState("profile");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Settings</h2>
        <p className="text-sm text-[#64748B] mt-1">Manage your account and application settings.</p>
      </div>

      <div className="rounded-2xl bg-white border border-[#E2E8F0] grid grid-cols-1 lg:grid-cols-[300px_1fr] overflow-hidden">
        {/* Tabs (left) */}
        <nav className="border-b lg:border-b-0 lg:border-r border-[#F1F5F9] p-3 space-y-1" aria-label="Settings sections">
          {TABS.map((t) => {
            const sel = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                data-testid={`settings-tab-${t.id}`}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                  sel ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                }`}
                aria-current={sel ? "true" : undefined}
              >
                <t.icon size={16} className={sel ? "text-[#2563EB] mt-0.5" : "text-[#64748B] mt-0.5"} />
                <div className="min-w-0">
                  <p className={`text-[13.5px] font-semibold ${sel ? "text-[#2563EB]" : "text-[#0F172A]"}`}>{t.label}</p>
                  <p className="text-[11.5px] text-[#94A3B8] mt-0.5 leading-snug">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Panel (right) */}
        <div className="p-6 sm:p-8">
          {active === "profile"       && <ProfileSection />}
          {active === "password"      && <PasswordSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "api"           && <ApiKeysSection />}
          {active === "billing"       && <BillingSection />}
          {active === "team"          && <TeamSection />}
          {active === "security"      && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

/* =========================== Sections =========================== */

function SectionHeader({ title, desc }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
      <p className="text-[13px] text-[#64748B] mt-1">{desc}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#0F172A] mb-2">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 transition-all";

function SaveBtn({ label = "Save Changes", onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid="settings-save-btn"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13.5px] font-semibold shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)]"
    >
      <Save size={14} /> {label}
    </button>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const initials = (user?.full_name || "OA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const [name, setName] = useState(user?.full_name || "OraOne Admin");
  const [email, setEmail] = useState(user?.email || "admin@oraone.in");

  return (
    <>
      <SectionHeader title="Profile Information" desc="Update your personal information and email address." />

      <div className="flex items-center gap-5 mb-7">
        <div className="size-20 rounded-full bg-[#2563EB] grid place-items-center text-white text-2xl font-bold">
          {initials}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#0F172A] inline-flex items-center gap-2">
            {user?.full_name || "OraOne Admin"}
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              {user?.role || "Owner"}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-5 max-w-2xl">
        <Field label="Full Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name" />
        </Field>
        <Field label="Email Address">
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="settings-email" />
        </Field>
        <Field label="Role">
          <div className="relative">
            <input className={`${inputCls} pr-10 bg-[#F8FAFC] text-[#64748B]`} value={user?.role || "Owner"} readOnly />
            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          </div>
        </Field>
      </div>

      <div className="mt-7">
        <SaveBtn onClick={() => toast.success("Profile updated")} />
      </div>
    </>
  );
}

function PasswordSection() {
  const [show, setShow] = useState(false);
  return (
    <>
      <SectionHeader title="Change Password" desc="Use a strong password you don't reuse anywhere else." />
      <div className="space-y-5 max-w-xl">
        {["Current Password", "New Password", "Confirm New Password"].map((l) => (
          <Field key={l} label={l}>
            <div className="relative">
              <input type={show ? "text" : "password"} className={`${inputCls} pr-11`} placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]" aria-label="Toggle visibility">
                {show ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </Field>
        ))}
      </div>
      <div className="mt-7"><SaveBtn label="Update Password" onClick={() => toast.success("Password updated")} /></div>
    </>
  );
}

function NotificationsSection() {
  const opts = [
    { id: "leads",  label: "New leads",            desc: "Email me when a new lead is captured." },
    { id: "calls",  label: "Missed calls",         desc: "Notify me when an inbound call is missed by all agents." },
    { id: "weekly", label: "Weekly digest",        desc: "Receive a weekly performance summary." },
    { id: "team",   label: "Team activity",        desc: "When a teammate joins, leaves, or changes role." },
  ];
  const [state, setState] = useState(Object.fromEntries(opts.map((o) => [o.id, true])));
  return (
    <>
      <SectionHeader title="Notifications" desc="Choose what you want to be notified about." />
      <div className="space-y-3 max-w-xl">
        {opts.map((o) => (
          <label key={o.id} className="flex items-start gap-4 p-4 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#0F172A]">{o.label}</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">{o.desc}</p>
            </div>
            <Toggle on={state[o.id]} onChange={() => setState((s) => ({ ...s, [o.id]: !s[o.id] }))} />
          </label>
        ))}
      </div>
      <div className="mt-7"><SaveBtn onClick={() => toast.success("Preferences saved")} /></div>
    </>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function ApiKeysSection() {
  const key = "oraone_live_sk_••••••••••••••••3a91";
  return (
    <>
      <SectionHeader title="API Keys" desc="Use these keys to authenticate API requests from your servers." />
      <div className="max-w-2xl rounded-xl border border-[#E2E8F0] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0F172A]">Live Secret Key</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">Server-side only. Never expose in client code.</p>
          </div>
          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Active</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 px-3 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[12.5px] text-[#0F172A] truncate">{key}</code>
          <button onClick={() => { navigator.clipboard?.writeText(key); toast.success("Key copied"); }} className="size-10 rounded-lg border border-[#E2E8F0] grid place-items-center hover:bg-[#F8FAFC]" aria-label="Copy"><Copy size={14} className="text-[#475569]" /></button>
        </div>
      </div>
      <div className="mt-7">
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#475569]" onClick={() => toast.info("Key rotation coming soon")}>
          Rotate key
        </button>
      </div>
    </>
  );
}

function BillingSection() {
  return (
    <>
      <SectionHeader title="Billing" desc="Manage your subscription, invoices and payment method." />
      <div className="max-w-2xl rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg,#2563EB,#1E40AF)" }}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold">Current Plan</p>
        <p className="mt-2 text-3xl font-bold">Free Beta</p>
        <p className="mt-1 text-[13px] text-white/80">All features. Cancel anytime.</p>
        <button className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#2563EB] text-[13px] font-semibold hover:bg-white/95">Upgrade plan</button>
      </div>
    </>
  );
}

function TeamSection() {
  return (
    <>
      <SectionHeader title="Team" desc="Add teammates, manage roles and access from the Team page." />
      <a href="/app/team" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold">Go to Team page →</a>
    </>
  );
}

function SecuritySection() {
  const [enabled, setEnabled] = useState(false);
  return (
    <>
      <SectionHeader title="Two-Factor Authentication" desc="Add an extra layer of security by requiring a 6-digit code on sign-in." />
      <div className="max-w-2xl rounded-xl border border-[#E2E8F0] p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#0F172A]">Authenticator app</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">Use Google Authenticator, 1Password, Authy, etc.</p>
        </div>
        <Toggle on={enabled} onChange={() => { setEnabled((v) => !v); toast.success(`2FA ${!enabled ? "enabled" : "disabled"}`); }} />
      </div>
    </>
  );
}
