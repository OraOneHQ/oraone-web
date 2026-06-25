import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, Menu } from "lucide-react";
import { DASH } from "@/constants/testIds";
import { useProjects } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import NotificationsMenu from "@/components/dashboard/NotificationsMenu";
import CommandPalette from "@/components/dashboard/CommandPalette";

const TITLES = {
  "/app/dashboard": "Dashboard",
  "/app/create-agent": "Create AI Agent",
  "/app/agents": "AI Agents",
  "/app/agents/new": "Create Agent",
  "/app/chat": "Chat",
  "/app/conversations": "Conversations",
  "/app/leads": "Leads",
  "/app/analytics": "Analytics",
  "/app/integrations": "Integrations",
  "/app/workflows": "Workflows",
  "/app/knowledge-base": "Knowledge Base",
  "/app/websites": "Website Crawling",
  "/app/knowledge-search": "Ask Knowledge",
  "/app/widgets": "Channels & Widgets",
  "/app/webhooks": "Webhooks",
  "/app/developers": "Developer Platform",
  "/app/api-keys": "API Keys",
  "/app/ai-models": "AI Models",
  "/app/branding": "Branding",
  "/app/billing": "Billing",
  "/app/usage": "Usage",
  "/app/audit-logs": "Audit Log",
  "/app/workspace": "Workspace",
  "/app/teams": "Teams",
  "/app/tasks": "Tasks",
  "/app/activity": "Activity & Notifications",
  "/app/notifications": "Notifications",
  "/app/operations": "Operations & Security",
  "/app/team": "Members",
  "/app/settings": "Settings",
  "/app/portal": "Customer Portal",
  "/app/getting-started": "Getting Started",
  "/app/feature-requests": "Feature Requests",
  "/app/changelog": "Changelog",
  "/app/status": "Product Status",
};

// Pages whose data is scoped to the active project. We surface a project chip
// next to the title so it's always clear which project you're working in.
const PROJECT_SCOPED = new Set([
  "/app/dashboard",
  "/app/create-agent",
  "/app/agents",
  "/app/chat",
  "/app/conversations",
  "/app/leads",
  "/app/analytics",
  "/app/integrations",
  "/app/workflows",
  "/app/knowledge-base",
  "/app/websites",
  "/app/knowledge-search",
  "/app/widgets",
  "/app/activity",
]);

// The primary action adapts to the page you're on instead of always being
// "Create Agent". Navigates to the create surface (pages may also open their
// own modal via location state / the oraone:create event).
const CONTEXT_ACTIONS = {
  "/app/dashboard": { label: "New Project", to: "/app/projects", state: { openCreate: true } },
  "/app/projects": { label: "New Project", to: "/app/projects", state: { openCreate: true } },
  "/app/agents": { label: "Create Agent", to: "/app/agents/new" },
  "/app/knowledge-base": { label: "New Knowledge Base", to: "/app/knowledge-base", state: { create: true } },
  "/app/websites": { label: "Add Website", to: "/app/websites", state: { create: true } },
  "/app/workflows": { label: "New Workflow", to: "/app/workflows", state: { create: true } },
  "/app/widgets": { label: "New Widget", to: "/app/widgets", state: { create: true } },
  "/app/integrations": { label: "Connect App", to: "/app/integrations", state: { create: true } },
  "/app/team": { label: "Invite Member", to: "/app/team", state: { create: true } },
};
const DEFAULT_ACTION = { label: "Create Agent", to: "/app/create-agent" };

export default function TopBar({ onMenuClick = () => {} }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { activeProject } = useProjects();
  const { organizationName } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const matchKey = Object.keys(TITLES).find((k) => pathname === k || pathname.startsWith(k + "/"));
  const title = TITLES[matchKey] || "Dashboard";
  const isProjectScoped = matchKey ? PROJECT_SCOPED.has(matchKey) : false;
  const action = CONTEXT_ACTIONS[matchKey] || DEFAULT_ACTION;

  // Cmd/Ctrl+K opens the global command palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const runAction = () => {
    window.dispatchEvent(new CustomEvent("oraone:create", { detail: { key: matchKey } }));
    nav(action.to, action.state ? { state: action.state } : undefined);
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-xl text-[#475569] hover:bg-[#F1F5F9]"
          aria-label="Open navigation menu"
          data-testid="dashboard-menu-btn"
        >
          <Menu size={20} />
        </button>
        {isProjectScoped && activeProject ? (
          <button
            onClick={() => nav("/app/projects")}
            className="text-base sm:text-lg font-semibold text-[#0F172A] tracking-tight truncate hover:text-[#2563EB] transition-colors"
            title={organizationName || "Workspace"}
            data-testid="topbar-workspace-name"
          >
            {organizationName || "Workspace"}
          </button>
        ) : (
          <h1 className="text-base sm:text-lg font-semibold text-[#0F172A] tracking-tight truncate">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-72 text-left hover:bg-[#F1F5F9] transition-colors"
          data-testid="dashboard-search-input"
        >
          <Search size={16} className="text-[#64748B]" />
          <span className="text-sm flex-1 text-[#94A3B8] truncate">Search anything…</span>
          <kbd className="rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[11px] text-[#94A3B8]">⌘K</kbd>
        </button>
        <button
          onClick={() => setPaletteOpen(true)}
          className="md:hidden p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9]"
          aria-label="Search"
          data-testid="dashboard-search-btn"
        >
          <Search size={18} />
        </button>

        <NotificationsMenu />

        <button
          onClick={runAction}
          className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:opacity-95 text-white text-sm font-semibold transition-opacity shrink-0 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)]"
          aria-label={action.label}
          data-testid={DASH.createAgentBtn}
        >
          <Plus size={16} /> <span className="hidden sm:inline">{action.label}</span>
        </button>

        <div className="pl-1 ml-0.5 border-l border-[#E2E8F0]">
          <ProfileMenu />
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
