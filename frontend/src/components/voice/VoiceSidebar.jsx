import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  PhoneCall,
  BookOpen,
  History,
  BarChart3,
  Workflow,
  Plug,
  FlaskConical,
  Megaphone,
  TrendingUp,
  Headphones,
  CalendarCheck,
  Mic2,
  ShieldAlert,
  ShieldCheck,
  Wand2,
  CreditCard,
  Wallet,
  FileText,
  Gauge,
  Settings,
  Plus,
  X,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { Logo, OraMark } from "@/components/marketing/Logo";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/hooks/useBranding";
import { useProjects } from "@/lib/projects";
import ProjectSwitcher from "@/components/dashboard/ProjectSwitcher";

// ─────────────────────────────────────────────────────────────────────────────
// Voice (Product 2) sidebar — its own enterprise navigation, styled identically
// to the Product 1 sidebar so both products feel like one ecosystem. Everything
// is scoped to the active project (top switcher).
// ─────────────────────────────────────────────────────────────────────────────
const topItem = { to: "/app/voice", icon: LayoutDashboard, label: "Dashboard", end: true };

const groups = [
  {
    section: "Build",
    items: [
      { to: "/app/voice/agents", icon: Bot, label: "Voice Agents" },
      { to: "/app/voice/numbers", icon: PhoneCall, label: "Phone Numbers" },
      { to: "/app/voice/knowledge", icon: BookOpen, label: "Knowledge" },
      { to: "/app/voice/prompt-studio", icon: Wand2, label: "Prompt Studio" },
      { to: "/app/voice/voice-studio", icon: Mic2, label: "Voice Studio" },
      { to: "/app/voice/workflows", icon: Workflow, label: "Workflows" },
      { to: "/app/voice/integrations", icon: Plug, label: "Integrations" },
    ],
  },
  {
    section: "Operate",
    items: [
      { to: "/app/voice/campaigns", icon: Megaphone, label: "Campaigns" },
      { to: "/app/voice/sales", icon: TrendingUp, label: "Sales Assistant" },
      { to: "/app/voice/handoff", icon: Headphones, label: "Handoff Queue" },
      { to: "/app/voice/appointments", icon: CalendarCheck, label: "Appointments" },
      { to: "/app/voice/payments", icon: Wallet, label: "Payments" },
      { to: "/app/voice/documents", icon: FileText, label: "Documents" },
      { to: "/app/voice/calls", icon: History, label: "Call History" },
      { to: "/app/voice/testing", icon: FlaskConical, label: "Testing Lab" },
    ],
  },
  {
    section: "Insights",
    items: [
      { to: "/app/voice/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/app/voice/supervisor", icon: ShieldAlert, label: "Supervisor" },
      { to: "/app/voice/compliance", icon: ShieldCheck, label: "Compliance" },
    ],
  },
  {
    section: "Account",
    items: [
      { to: "/app/voice/billing", icon: CreditCard, label: "Billing" },
      { to: "/app/voice/usage", icon: Gauge, label: "Usage" },
      { to: "/app/voice/settings", icon: Settings, label: "Settings" },
    ],
  },
];

function BrandHeader() {
  const { branding } = useBranding();
  const { organizationName } = useAuth();
  const workspace = organizationName || branding?.organization_name || "Workspace";
  const mark = branding?.logo_url ? (
    <img
      src={branding.logo_url}
      alt={branding.brand_name || workspace || "Brand"}
      className="h-7 max-w-[150px] object-contain"
    />
  ) : (
    <Logo />
  );
  return (
    <Link
      to="/app/voice"
      className="min-w-0 block rounded-lg -m-1 p-1 transition-colors hover:bg-[#F8FAFC]"
      aria-label="Voice dashboard"
    >
      {mark}
    </Link>
  );
}

function SidebarContent({ onItemClick, showClose, onClose }) {
  const { activeProject } = useProjects();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
    }`;

  const projectColor = activeProject?.color || "#2563EB";
  const projectLabel = activeProject?.name || "Project";

  return (
    <>
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E8F0]">
        <BrandHeader />
        {showClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <ProjectSwitcher onNavigate={onItemClick} />

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* Voice product pill */}
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#EFF4FF] to-[#F5F3FF] px-3 py-2 ring-1 ring-[#E0E7FF]">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white">
            <Sparkles size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold leading-tight text-[#0F172A]">Voice AI</p>
            <p className="text-[10.5px] leading-tight text-[#64748B]">Enterprise platform</p>
          </div>
        </div>

        {/* Primary CTA */}
        <NavLink
          to="/app/voice/agents?create=1"
          onClick={onItemClick}
          className="flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#06B6D4] shadow-sm hover:opacity-95 transition-opacity"
        >
          <Plus size={18} />
          Create Voice Agent
        </NavLink>

        <div className="mt-1 mb-1 flex items-center gap-2 px-3 pt-2">
          <span className="size-2.5 flex-shrink-0 rounded-full" style={{ background: projectColor }} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            {projectLabel}
          </span>
        </div>

        <NavLink to={topItem.to} end={topItem.end} onClick={onItemClick} className={linkClass}>
          <topItem.icon size={18} />
          {topItem.label}
        </NavLink>

        {groups.map((group) => (
          <div key={group.section} className="pt-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              {group.section}
            </p>
            {group.items.map((it) => (
              <NavLink key={it.to} to={it.to} onClick={onItemClick} className={linkClass}>
                <it.icon size={18} />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Back to main platform */}
      <div className="mx-3 mb-3">
        <Link
          to="/app/dashboard"
          onClick={onItemClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A]"
        >
          <ChevronLeft size={15} /> Back to Platform
        </Link>
      </div>

      <div className="p-3 border-t border-[#E2E8F0]">
        <a
          href="https://oraone.in"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569] transition-colors"
        >
          <OraMark size={14} className="shrink-0" />
          <span className="leading-none">
            Powered by <span className="font-semibold text-[#475569]">OraOne</span>
          </span>
        </a>
      </div>
    </>
  );
}

export default function VoiceSidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E2E8F0] flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      <div className={`lg:hidden fixed inset-0 z-50 ${mobileOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileOpen}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white border-r border-[#E2E8F0] flex flex-col shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Voice navigation menu"
        >
          <SidebarContent onItemClick={onClose} showClose onClose={onClose} />
        </aside>
      </div>
    </>
  );
}
