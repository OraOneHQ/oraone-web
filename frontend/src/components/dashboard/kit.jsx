import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   OraOne dashboard UI kit — "Luminous"
   Small set of premium, consistent building blocks used across every
   dashboard page so the whole product feels cohesive and high-end.
   ────────────────────────────────────────────────────────────────────────── */

export const BRAND = "#2563EB";
export const BRAND2 = "#4F46E5";
export const INK = "#0F172A";
export const SUB = "#64748B";
export const MUTED = "#94A3B8";
export const LINE = "#E7EAF1";

export const cx = (...c) => c.filter(Boolean).join(" ");

/* Page header with gradient eyebrow + actions slot. */
export function PageHeader({ eyebrow, title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
            <span className="size-2.5 rounded-full bg-gradient-to-br from-[#2563EB] to-[#4F46E5]" />
            {eyebrow}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          {Icon && (
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#EFF4FF] to-[#F5F3FF] text-[#2563EB] ring-1 ring-[#E0E7FF]">
              <Icon size={20} />
            </span>
          )}
          <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[#0F172A] truncate">
            {title}
          </h1>
        </div>
        {subtitle && <p className="mt-1.5 text-sm text-[#64748B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Premium surface card. */
export function Card({ className = "", children, hover = false, ...rest }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-[#E7EAF1] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)]",
        hover && "transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_16px_36px_-16px_rgba(16,24,40,0.18)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* Trend chip. */
export function Delta({ up, children }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ color: up ? "#067647" : "#B42318", background: up ? "#ECFDF3" : "#FEF3F2" }}
    >
      <TrendingUp size={11} style={{ transform: up ? "none" : "scaleY(-1)" }} />
      {children}
    </span>
  );
}

/* KPI / stat card. */
export function StatCard({ icon: Icon, label, value, sub, delta, up, tone = BRAND, bg = "#EFF4FF", to }) {
  const inner = (
    <Card hover className="h-full p-4">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl" style={{ background: bg }}>
          {Icon && <Icon size={16} style={{ color: tone }} />}
        </span>
        {delta && <Delta up={up}>{delta}</Delta>}
      </div>
      <p className="mt-3 text-[24px] font-extrabold tracking-tight text-[#0F172A]">{value}</p>
      <p className="mt-0.5 text-[12px] text-[#64748B]">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-[#94A3B8]">{sub}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

/* Section heading with icon chip. */
export function SectionTitle({ icon: Icon, title, subtitle, tone = BRAND, right }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg" style={{ background: `${tone}15` }}>
            <Icon size={14} style={{ color: tone }} />
          </span>
        )}
        <div>
          <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* Segmented toggle. */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cx(
              "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition",
              active ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
            )}
          >
            {label}
            {typeof o !== "string" && o.badge && (
              <span className="ml-1.5 text-[11px] font-semibold text-[#16A34A]">{o.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Status badge. */
const TONES = {
  green: "bg-[#DCFCE7] text-[#15803D]",
  blue: "bg-[#DBEAFE] text-[#1D4ED8]",
  indigo: "bg-[#EEF2FF] text-[#4338CA]",
  amber: "bg-[#FEF3C7] text-[#B45309]",
  red: "bg-[#FEE2E2] text-[#B91C1C]",
  slate: "bg-[#F1F5F9] text-[#475569]",
};
export function Badge({ tone = "slate", children, className = "" }) {
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", TONES[tone] || TONES.slate, className)}>
      {children}
    </span>
  );
}

/* Ghost / outline button. */
export function GhostButton({ as: As = "button", className = "", children, ...rest }) {
  return (
    <As
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7EAF1] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F6F8FC]",
        className
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/* Primary gradient button. */
export function PrimaryButton({ as: As = "button", className = "", children, ...rest }) {
  return (
    <As
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] transition-opacity hover:opacity-95 disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/* Empty state. */
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E7EAF1] bg-white p-10 text-center">
      {Icon && (
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#F5F7FB] text-[#94A3B8]">
          <Icon size={22} />
        </span>
      )}
      {title && <p className="mt-3 text-sm font-semibold text-[#0F172A]">{title}</p>}
      {hint && <p className="mt-1 text-[13px] text-[#64748B]">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
