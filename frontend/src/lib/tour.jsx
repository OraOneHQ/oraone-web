import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "oraone_tour_v1";

// One flow: create an agent -> deploy it -> test it -> publish it live.
// Each step highlights a real on-screen element via [data-tour="<id>"].
// Advancing to the next step happens automatically once that step's target
// element appears in the DOM (so it self-corrects around gated/disabled UI
// instead of relying on a raw click listener).
export const TOUR_STEPS = [
  {
    id: "create-agent",
    title: "Create your first agent",
    body: "Click here to start building an AI agent for your website.",
    route: "/app/dashboard",
  },
  {
    id: "pick-chat-type",
    title: "Choose a type & continue",
    body: "Chat Agent answers visitors on your website. WhatsApp works the same way — pick one and click Next.",
    route: "/app/agents/new",
  },
  {
    id: "agent-name-input",
    title: "Name it & describe its purpose",
    body: "Give your agent a name and a short purpose, then continue through the wizard.",
    manualNext: true,
  },
  {
    id: "builder-tab-review",
    title: "Jump to Review & Deploy",
    body: "Once the basics are filled in, open the final step here.",
  },
  {
    id: "agent-deploy-btn",
    title: "Deploy your agent",
    body: "This activates the agent and takes you straight to its Channels & Deploy page.",
  },
  {
    id: "deploy-test-widget-btn",
    title: "Test it — no website needed",
    body: "This loads the real chat widget right here so you can try it, and publishes it live automatically.",
    doneSignal: "deploy-live-badge",
  },
  {
    id: "tour-done",
    title: "You're all set 🎉",
    body: "Your agent is live. Copy the embed snippet onto your site any time from this same page.",
  },
];

const TourContext = createContext(null);

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: false, index: 0 };
    const parsed = JSON.parse(raw);
    return { active: !!parsed.active, index: Number(parsed.index) || 0 };
  } catch {
    return { active: false, index: 0 };
  }
}

function saveState(s) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function TourProvider({ children }) {
  const [state, setState] = useState(loadState);
  const { pathname } = useLocation();

  useEffect(() => saveState(state), [state]);

  const start = useCallback(() => setState({ active: true, index: 0 }), []);
  const exit = useCallback(() => setState({ active: false, index: 0 }), []);
  const next = useCallback(
    () => setState((s) => ({ ...s, index: Math.min(s.index + 1, TOUR_STEPS.length - 1) })),
    []
  );
  const back = useCallback(() => setState((s) => ({ ...s, index: Math.max(s.index - 1, 0) })), []);

  // Poll for the CURRENT step's target and for whether the NEXT step's
  // target has already appeared (meaning the user completed the action).
  const pollRef = useRef(null);
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!state.active) return undefined;
    const step = TOUR_STEPS[state.index];
    if (!step || step.manualNext) return undefined;
    const nextStep = TOUR_STEPS[state.index + 1];
    if (!nextStep) return undefined;
    const targetId = step.doneSignal || nextStep.id;
    pollRef.current = setInterval(() => {
      const el = document.querySelector(`[data-tour="${targetId}"]`);
      if (el && el.offsetParent !== null) {
        setState((s) => (s.index === state.index ? { ...s, index: s.index + 1 } : s));
      }
    }, 400);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.index, pathname]);

  const value = useMemo(
    () => ({ ...state, total: TOUR_STEPS.length, start, exit, next, back }),
    [state, start, exit, next, back]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
