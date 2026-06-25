import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Sparkles,
  MessagesSquare,
  Users,
  BarChart3,
  Plug,
  Workflow,
  BookOpen,
  Globe,
  Search,
  Code2,
  Plus,
  X,
  ChevronUp,
  Sparkle,
} from "lucide-react";
import { Logo, OraMark } from "@/components/marketing/Logo";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/hooks/useBranding";
import { useProjects } from "@/lib/projects";
import ProjectSwitcher from "@/components/dashboard/ProjectSwitcher";
import { DASH } from "@/constants/testIds";

// ─────────────────────────────────────────────────────────────────────────────
// The sidebar is PROJECT-ONLY. Everything here belongs to the active project and
// re-scopes when you switch projects (top-left switcher). Company-level settings
// (members, billing, branding, API keys, models, audit logs…) live in the
// top-right profile menu, not here — keeping daily work clean and focused.
// ─────────────────────────────────────────────────────────────────────────────
const topItem = {
  to: "/app/dashboard",
  icon: LayoutDashboard,
  label: "Dashboard",
  id: DASH.sidebarOverview,
};

const projectGroups = [
  {
    section: "Build",
    items: [
      { to: "/app/agents", icon: Bot, label: "AI Agents", id: DASH.sidebarAgents },
      { to: "/app/knowledge-base", icon: BookOpen, label: "Knowledge Base", id: DASH.sidebarKnowledge },
      { to: "/app/websites", icon: Globe, label: "Websites" },
      { to: "/app/integrations", icon: Plug, label: "Integrations", id: DASH.sidebarIntegrations },
    ],
  },
  {
    section: "Operate",
    items: [
      { to: "/app/conversations", icon: MessagesSquare, label: "Conversations", id: DASH.sidebarConversations },
      { to: "/app/leads", icon: Users, label: "Leads", id: DASH.sidebarLeads },
      { to: "/app/widgets", icon: Code2, label: "Channels & Widgets" },
      { to: "/app/workflows", icon: Workflow, label: "Workflows" },
    ],
  },
  {
    section: "Insights",
    items: [
      { to: "/app/analytics", icon: BarChart3, label: "Analytics", id: DASH.sidebarAnalytics },
    ],
  },
  {
    section: "Tools",
    items: [
      { to: "/app/knowledge-search", icon: Search, label: "Ask Knowledge" },
      { to: "/app/chat", icon: Sparkles, label: "Chat", id: DASH.sidebarChat },
    ],
  },
];

function BrandHeader() {
  const { branding } = useBranding();
  const { organizationName } = useAuth();
  const workspace = organizationName || branding?.organization_name || "Workspace";

  // White-label: honor a customer-uploaded logo image; otherwise always show
  // the OraOne brand mark + wordmark to reinforce the product brand.
  const mark = branding?.logo_url ? (
    <img
      src={branding.logo_url}
      alt={branding.brand_name || workspace || "Brand"}
      className="h-7 max-w-[150px] object-contain"
      data-testid="sidebar-brand-logo"
    />
  ) : (
    <Logo />
  );

  return (
    <Link
      to="/app/dashboard"
      className="min-w-0 block rounded-lg -m-1 p-1 transition-colors hover:bg-[#F8FAFC]"
      aria-label="Go to dashboard"
      data-testid="sidebar-brand-home"
    >
      {mark}
    </Link>
  );
}

function SidebarContent({ onItemClick, showClose, onClose }) {
  const { activeProject } = useProjects();
  const [upgradeHidden, setUpgradeHidden] = useState(() => {
    try {
      return localStorage.getItem("ora_upgrade_hidden") === "1";
    } catch {
      return false;
    }
  });
  const hideUpgrade = () => {
    setUpgradeHidden(true);
    try {
      localStorage.setItem("ora_upgrade_hidden", "1");
    } catch {
      /* storage blocked */
    }
  };
  const restoreUpgrade = () => {
    setUpgradeHidden(false);
    try {
      localStorage.removeItem("ora_upgrade_hidden");
    } catch {
      /* storage blocked */
    }
  };
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-[#EFF6FF] text-[#2563EB]"
        : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
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
            data-testid="sidebar-close-btn"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <ProjectSwitcher onNavigate={onItemClick} />
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* Primary call-to-action: the guided journey */}
        <NavLink
          to="/app/create-agent"
          onClick={onItemClick}
          data-testid="sidebar-create-agent"
          className="flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#06B6D4] shadow-sm hover:opacity-95 transition-opacity"
        >
          <Plus size={18} />
          Create AI Agent
        </NavLink>

        {/* The project name reminds you which project everything is scoped to. */}
        <div
          className="mt-1 mb-1 flex items-center gap-2 px-3 pt-2"
          data-testid="sidebar-project-zone-header"
        >
          <span
            className="size-2.5 flex-shrink-0 rounded-full"
            style={{ background: projectColor }}
          />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            {projectLabel}
          </span>
        </div>

        {/* Overview sits at the top of the project nav */}
        <NavLink
          to={topItem.to}
          data-testid={topItem.id}
          onClick={onItemClick}
          className={linkClass}
        >
          <topItem.icon size={18} />
          {topItem.label}
        </NavLink>

        {projectGroups.map((group) => (
          <div key={group.section} className="pt-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              {group.section}
            </p>
            {group.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                data-testid={it.id}
                onClick={onItemClick}
                className={linkClass}
              >
                <it.icon size={18} />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Upgrade nudge — minimizable Luminous accent card */}
      {upgradeHidden ? (
        <div className="mx-3 mb-3">
          <Link
            to="/app/billing"
            onClick={onItemClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E7FF] bg-[#F5F7FF] px-3 py-2 text-[12px] font-semibold text-[#4F46E5] transition-colors hover:bg-[#EEF2FF]"
            data-testid="sidebar-upgrade-mini"
          >
            <Sparkle size={14} /> Upgrade plan
          </Link>
          <button
            type="button"
            onClick={restoreUpgrade}
            className="mt-1 mx-auto block text-[10.5px] font-medium text-[#94A3B8] hover:text-[#64748B] transition-colors"
            data-testid="sidebar-upgrade-expand"
          >
            Show details
          </button>
        </div>
      ) : (
        <div className="relative mx-3 mb-3 rounded-2xl border border-[#E0E7FF] bg-gradient-to-br from-[#EFF4FF] to-[#F5F3FF] p-4">
          <button
            type="button"
            onClick={hideUpgrade}
            className="absolute right-2 top-2 grid size-6 place-items-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/70 hover:text-[#475569]"
            aria-label="Minimize upgrade card"
            data-testid="sidebar-upgrade-minimize"
          >
            <ChevronUp size={14} />
          </button>
          <p className="text-[13px] font-bold text-[#0F172A]">You're on Starter</p>
          <p className="mt-0.5 text-[12px] text-[#64748B]">Unlock voice agents &amp; unlimited seats.</p>
          <Link
            to="/app/billing"
            onClick={onItemClick}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-[#0F172A] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* "Powered by OraOne" — survives white-labeling, small and elegant. */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <a
          href="https://oraone.in"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569] transition-colors"
          data-testid="sidebar-powered-by"
        >
          <OraMark size={14} className="shrink-0" />
          <span className="leading-none">Powered by <span className="font-semibold text-[#475569]">OraOne</span></span>
        </a>
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E2E8F0] flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          data-testid="sidebar-backdrop"
        />
        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white border-r border-[#E2E8F0] flex flex-col shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          data-testid="mobile-sidebar"
        >
          <SidebarContent
            onItemClick={onClose}
            showClose
            onClose={onClose}
          />
        </aside>
      </div>
    </>
  );
}
