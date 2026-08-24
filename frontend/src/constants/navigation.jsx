// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the authenticated app's information architecture.
//
// Both the Sidebar (primary nav) and the TopBar (section tab bars) read from
// this file, so navigation stays consistent and is trivial to extend when a new
// product ships. Nothing here fetches data or holds state — it is pure config,
// which keeps the navigation surfaces dumb and testable (SRP).
//
// Product/feature gating is expressed declaratively via `product` / `feature`
// keys that map to the entitlement engine (see `@/lib/entitlements`). The
// backend remains the authoritative, fail-closed authority; this only decides
// what to *show*.
// ─────────────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard,
  Bot,
  MessagesSquare,
  BookOpen,
  Plug,
  Users,
} from "lucide-react";
import { DASH } from "@/constants/testIds";

// Primary sidebar. Intentionally minimal — everything else lives inside a
// section (as tabs), Settings, or the command palette. `product` / `feature`
// gate an item behind the entitlement system so future products appear
// automatically without touching the sidebar component.
export const PRIMARY_NAV = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard", id: DASH.sidebarOverview, end: true },
  { to: "/app/agents", icon: Bot, label: "AI Agents", id: DASH.sidebarAgents, tour: "nav-agents" },
  { to: "/app/conversations", icon: MessagesSquare, label: "Conversations", id: DASH.sidebarConversations, tour: "nav-conversations" },
  { to: "/app/leads", icon: Users, label: "Leads", id: DASH.sidebarLeads },
  { to: "/app/knowledge-base", icon: BookOpen, label: "Knowledge Base", id: DASH.sidebarKnowledge, tour: "nav-knowledge" },
  { to: "/app/integrations", icon: Plug, label: "Integrations", id: DASH.sidebarIntegrations },
];

// Pinned to the very bottom of the sidebar (above the profile footer).
export const SECONDARY_NAV = [];

// Section tab bars. Keyed by the section root. When the active route lives
// inside a section, the TopBar renders these as horizontal tabs — turning what
// used to be a dozen separate sidebar items into a single, focused surface.
// `end: true` marks the index tab (active only on an exact match).
export const SECTIONS = {
  "/app/agents": {
    label: "AI Agents",
    tabs: [
      { to: "/app/agents", label: "Overview", end: true },
      { to: "/app/agents/templates", label: "Templates", feature: "marketplace" },
    ],
  },
  "/app/knowledge-base": {
    label: "Knowledge",
    tabs: [
      { to: "/app/knowledge-base", label: "Knowledge Bases", end: true },
      { to: "/app/knowledge-base/websites", label: "Websites" },
      { to: "/app/knowledge-base/search", label: "Ask Knowledge" },
      { to: "/app/knowledge-base/coverage", label: "Coverage" },
    ],
  },
};

// Resolve the section config for a given pathname (longest-prefix match so
// `/app/agents/versions` resolves to the `/app/agents` section).
export function resolveSection(pathname) {
  const root = Object.keys(SECTIONS)
    .filter((r) => pathname === r || pathname.startsWith(r + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return root ? { root, ...SECTIONS[root] } : null;
}

// Filter a list of nav/tab entries by the caller's entitlements. `check` is
// `{ isProductEnabled, isFeatureEnabled }` from `useEntitlements()`.
export function filterByEntitlements(items, { isProductEnabled, isFeatureEnabled } = {}) {
  return items.filter((it) => {
    if (it.product && isProductEnabled && !isProductEnabled(it.product)) return false;
    if (it.feature && isFeatureEnabled && !isFeatureEnabled(it.feature)) return false;
    return true;
  });
}
