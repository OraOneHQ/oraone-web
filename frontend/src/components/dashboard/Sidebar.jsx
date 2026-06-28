import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  MessagesSquare,
  Users,
  BarChart3,
  Plug,
  Workflow,
  BookOpen,
  Rocket,
  Store,
  Sparkles,
  Contact,
  Settings,
  Gauge,
  TrendingUp,
  UserSearch,
  FlaskConical,
  History,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { Logo } from "@/components/marketing/Logo";
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

// Flat, product-level navigation that mirrors the approved dashboard design.
const navItems = [
  { to: "/app/agents", icon: Bot, label: "AI Agents", id: DASH.sidebarAgents },
  { to: "/app/conversations", icon: MessagesSquare, label: "Conversations", id: DASH.sidebarConversations },
  { to: "/app/knowledge-base", icon: BookOpen, label: "Knowledge Base", id: DASH.sidebarKnowledge },
  { to: "/app/workflows", icon: Workflow, label: "Workflows" },
  { to: "/app/deploy", icon: Rocket, label: "Channels & Deploy" },
  { to: "/app/marketplace", icon: Store, label: "Marketplace" },
  { to: "/app/assistants", icon: Sparkles, label: "AI Assistants" },
  { to: "/app/integrations", icon: Plug, label: "Integrations", id: DASH.sidebarIntegrations },
  { to: "/app/analytics", icon: BarChart3, label: "Analytics", id: DASH.sidebarAnalytics },
  { to: "/app/optimization-score", icon: Gauge, label: "Optimization Score" },
  { to: "/app/knowledge-coverage", icon: BookOpen, label: "Knowledge Coverage" },
  { to: "/app/revenue-attribution", icon: TrendingUp, label: "Revenue Attribution" },
  { to: "/app/quality-lab", icon: FlaskConical, label: "Quality Lab" },
  { to: "/app/agent-versions", icon: History, label: "Agent Versions" },
  { to: "/app/leads", icon: Users, label: "Leads", id: DASH.sidebarLeads, badge: "New" },
  { to: "/app/customer-360", icon: UserSearch, label: "Customer 360" },
  { to: "/app/contacts", icon: Contact, label: "Contacts" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
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
  const { user, membershipRole } = useAuth();
  const userName = user?.full_name || user?.name || "Your account";
  const userInitial = (userName || "U").trim().charAt(0).toUpperCase();
  const roleLabel = membershipRole || "Member";

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-[#EFF6FF] text-[#2563EB]"
        : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
    }`;

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
        <NavLink
          to={topItem.to}
          data-testid={topItem.id}
          onClick={onItemClick}
          className={linkClass}
          end
        >
          <topItem.icon size={18} />
          {topItem.label}
        </NavLink>

        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            data-testid={it.id}
            onClick={onItemClick}
            className={linkClass}
          >
            <it.icon size={18} />
            <span className="flex-1">{it.label}</span>
            {it.badge && (
              <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                {it.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Plan usage card */}
      <div className="mx-3 mb-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-[#0F172A]">Starter Plan</p>
          <Link
            to="/app/billing"
            onClick={onItemClick}
            className="text-[11.5px] font-semibold text-[#2563EB] hover:underline"
          >
            Manage
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11.5px] text-[#64748B]">
              <span>Call minutes</span>
              <span className="font-semibold text-[#334155]">320 / 1,000</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: "32%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11.5px] text-[#64748B]">
              <span>Active agents</span>
              <span className="font-semibold text-[#334155]">3 / 10</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: "30%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* User profile footer */}
      <div className="border-t border-[#E2E8F0] p-3">
        <Link
          to="/app/settings"
          onClick={onItemClick}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#F8FAFC]"
          data-testid="sidebar-profile"
        >
          <span className="grid size-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-[13px] font-bold text-white">
            {userInitial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#0F172A]">{userName}</p>
            <p className="truncate text-[11.5px] capitalize text-[#94A3B8]">{roleLabel}</p>
          </div>
          <ChevronsUpDown size={15} className="flex-shrink-0 text-[#94A3B8]" />
        </Link>
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
