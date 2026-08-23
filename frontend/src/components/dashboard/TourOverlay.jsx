import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { useTour, TOUR_STEPS } from "@/lib/tour";

function useTargetRect(selector) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!selector) {
      setRect(null);
      return undefined;
    }
    let raf;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${selector}"]`);
      if (el && el.offsetParent !== null) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [selector]);
  return rect;
}

export default function TourOverlay() {
  const { active, index, total, exit, next, back } = useTour();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const step = active ? TOUR_STEPS[index] : null;
  const isDone = step?.id === "tour-done";
  const rect = useTargetRect(!isDone && step ? step.id : null);

  // If this step expects a specific page and we're not on it (e.g. the tour
  // was launched from the Guide page), jump there so the target can render.
  useEffect(() => {
    if (step?.route && pathname !== step.route && !document.querySelector(`[data-tour="${step.id}"]`)) {
      nav(step.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  if (!active || !step) return null;

  // For the final step (or while the target hasn't rendered yet), show a
  // centered card instead of a spotlight so the tour never gets visually stuck.
  const showSpotlight = !isDone && !!rect;

  const cardStyle = showSpotlight
    ? {
        position: "fixed",
        top: Math.min(rect.top + rect.height + 14, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340),
        width: 320,
      }
    : {};

  return (
    <AnimatePresence>
      <motion.div
        key={step.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] pointer-events-none"
      >
        {showSpotlight && (
          <div
            className="fixed rounded-xl ring-4 ring-[#2563EB] pointer-events-none transition-all duration-300"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(15,23,42,0.55)",
            }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`pointer-events-auto rounded-2xl bg-white p-5 shadow-2xl ${
            showSpotlight ? "" : "fixed left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2"
          }`}
          style={showSpotlight ? cardStyle : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2563EB]">
              Step {index + 1} of {total}
            </p>
            <button onClick={exit} aria-label="Exit tour" className="text-[#94A3B8] hover:text-[#475569]">
              <X size={16} />
            </button>
          </div>
          <p className="mt-2 text-[15px] font-bold text-[#0F172A]">{step.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">{step.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={back}
              disabled={index === 0}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#64748B] hover:text-[#0F172A] disabled:opacity-0"
            >
              <ArrowLeft size={13} /> Back
            </button>
            {(step.manualNext || isDone) && (
              <button
                onClick={isDone ? exit : next}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1D4ED8]"
              >
                {isDone ? "Finish" : "Continue"} <ArrowRight size={13} />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
