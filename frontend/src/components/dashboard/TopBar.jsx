import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, Plus, Menu, Building2 } from "lucide-react";
import { DASH } from "@/constants/testIds";
import { useAuth } from "@/lib/auth";

const TITLES = {
  "/app/overview": "Overview",
  "/app/agents": "Agents",
  "/app/agents/new": "Create Agent",
  "/app/conversations": "Conversations",
  "/app/leads": "Leads",
  "/app/analytics": "Analytics",
  "/app/integrations": "Integrations",
  "/app/knowledge-base": "Knowledge Base",
  "/app/team": "Team",
  "/app/settings": "Settings",
};

export default function TopBar({ onMenuClick = () => {} }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { organizationName, membershipRole } = useAuth();
  const matchKey = Object.keys(TITLES).find((k) => pathname === k || pathname.startsWith(k + "/"));
  const title = TITLES[matchKey] || "Dashboard";

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
        <h1 className="text-base sm:text-lg font-semibold text-[#0F172A] tracking-tight truncate">{title}</h1>
        {organizationName && (
          <div
            className="hidden sm:flex items-center gap-1.5 pl-3 ml-1 border-l border-[#E2E8F0] min-w-0"
            data-testid="topbar-workspace"
          >
            <Building2 size={14} className="text-[#94A3B8] shrink-0" />
            <span
              className="text-sm font-medium text-[#475569] truncate max-w-[200px]"
              title={organizationName}
              data-testid="topbar-workspace-name"
            >
              {organizationName}
            </span>
            {membershipRole && (
              <span
                className="text-[10px] uppercase tracking-wide font-semibold text-[#7C3AED] bg-[#F5F0FF] px-1.5 py-0.5 rounded-md"
                data-testid="topbar-workspace-role"
              >
                {membershipRole}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] w-72">
          <Search size={16} className="text-[#64748B]" />
          <input
            placeholder="Search anything..."
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-[#94A3B8] min-w-0"
            data-testid="dashboard-search-input"
          />
        </div>
        <button
          className="md:hidden p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9]"
          aria-label="Search"
          data-testid="dashboard-search-btn"
        >
          <Search size={18} />
        </button>
        <button
          className="p-2.5 rounded-xl text-[#64748B] hover:bg-[#F1F5F9] relative"
          aria-label="Notifications"
          data-testid="dashboard-notifications-btn"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[#EF4444]" />
        </button>
        <button
          onClick={() => nav("/app/agents/new")}
          className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors shrink-0"
          data-testid={DASH.createAgentBtn}
        >
          <Plus size={16} /> <span className="hidden sm:inline">Create Agent</span>
        </button>
      </div>
    </header>
  );
}
