import React from "react";

/* =========================================================================
   OraOne brand logo — "Orbit": one central AI core with a conversation node
   orbiting a continuous (always-on) ring, in the brand blue -> cyan gradient.

   The mark encodes the product vision literally — "One AI. Every
   Conversation": the solid CORE is the single unified AI brain; the
   unbroken RING is the always-on, 24/7 nature of the service; the bright
   NODE riding the ring is a live conversation in orbit around that one AI.
   It reads as a confident, tech-forward "O" (Ora / One) at any size, with
   no generic speech-bubble cliché and no letterform to decode.

   Exports (kept backward-compatible with the previous logo):
     • <Logo />        full lockup (mark + "Ora One" wordmark [+ tagline])
     • <OraMark />     mark only (the master brand mark)
     • <BrandMark />   alias of OraMark
     • <AppIcon />     mark reversed to white inside a solid gradient
                       rounded-square tile — dedicated favicon/app-icon
                       derivative, NEVER used as the primary logo
     • BRAND_LOGO_URL / BRAND_MARK_URL / BRAND_WORDMARK_URL (legacy fallbacks)
   ========================================================================= */

export const BRAND_LOGO_URL = "/assets/brand-logo.png";
export const BRAND_MARK_URL = "/assets/brand-logo.png";
export const BRAND_WORDMARK_URL = "/assets/brand-logo.png";

let uid = 0;
const nextId = () => `ora-${++uid}`;

// Shared mark geometry (viewBox 0 0 40 40) — single source of truth so
// <OraMark /> and <AppIcon /> never drift apart. Ring radius 13, core 5,
// node 3.4 seated on the ring at the upper-right (-45°).
const RING = { cx: 20, cy: 20, r: 13, w: 2.8 };
const CORE = { cx: 20, cy: 20, r: 5 };
const NODE = { cx: 29.19, cy: 10.81, r: 3.4 };

/**
 * OraMark — the OraOne "Orbit" mark (gradient always-on ring + unified AI
 * core + a conversation node in orbit), the master brand mark. `light`
 * renders a flat white version for dark backgrounds — same geometry,
 * monochrome fill, never a redrawn shape.
 */
export function OraMark({ size = 40, className = "", light = false, ...rest }) {
  const gid = nextId();
  const grad = `url(#${gid}-mark)`;
  const ringStroke = light ? "#FFFFFF" : grad;
  const coreFill = light ? "#FFFFFF" : grad;
  const nodeFill = light ? "#0F172A" : "#06B6D4";
  const nodeStroke = light ? "#FFFFFF" : "#FFFFFF";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={`${gid}-mark`} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx={RING.cx} cy={RING.cy} r={RING.r} fill="none" stroke={ringStroke} strokeWidth={RING.w} />
      <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill={coreFill} />
      <circle cx={NODE.cx} cy={NODE.cy} r={NODE.r} fill={nodeFill} stroke={nodeStroke} strokeWidth="1.3" />
    </svg>
  );
}

// Backward-compatible alias
export function BrandMark(props) {
  return <OraMark {...props} />;
}

/**
 * AppIcon — the OraOne mark (reversed to white) inside a solid brand-
 * gradient rounded-square tile. This is the dedicated favicon/app-icon/PWA
 * derivative for the smallest sizes (16-32px), where the mark needs the
 * extra contrast of a solid tile background. It is NOT an alternate logo —
 * only the master <OraMark /> should ever be called "the logo".
 */
export function AppIcon({ size = 40, className = "", ...rest }) {
  const gid = nextId();
  const pad = size * 0.16;
  const inner = size - pad * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={`${gid}-tile`} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={size * 0.26} fill={`url(#${gid}-tile)`} />
      <g transform={`translate(${pad}, ${pad}) scale(${inner / 40})`}>
        <circle cx={RING.cx} cy={RING.cy} r={RING.r} fill="none" stroke="#FFFFFF" strokeWidth={RING.w} />
        <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill="#FFFFFF" />
        <circle cx={NODE.cx} cy={NODE.cy} r={NODE.r} fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

/**
 * Logo — full horizontal lockup: orb mark + "Ora One" wordmark.
 *
 * Props:
 *   className    — sizing class (height-based, e.g. "h-9"). Default "h-9".
 *   light        — white mark + wordmark for dark surfaces.
 *   showWordmark — hide text to render mark-only. Default true.
 *   showTagline  — show "One AI. Every Conversation." beneath. Default false.
 *   stacked      — vertical lockup (mark above wordmark). Default false.
 */
export function Logo({
  className = "h-9",
  light = false,
  showWordmark = true,
  showTagline = false,
  stacked = false,
  ...rest
}) {
  const sizeMap = { "h-6": 24, "h-7": 28, "h-8": 32, "h-9": 36, "h-10": 40, "h-11": 44, "h-12": 48, "h-14": 56, "h-16": 64, "h-20": 80, "h-24": 96 };
  const heightClass = (className.match(/h-\d+/) || ["h-9"])[0];
  const orbSize = sizeMap[heightClass] || 36;
  const wordSize = orbSize * (stacked ? 0.74 : 0.66);

  const wordmark = (
    <span className="font-extrabold tracking-tight leading-none" style={{ fontSize: wordSize }}>
      <span style={{ color: light ? "#FFFFFF" : "#0A1B3A" }}>Ora</span>
      <span style={{ color: light ? "#7DD3FC" : "#1E73E8" }}>One</span>
    </span>
  );

  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center gap-2 select-none" {...rest}>
        <OraMark size={orbSize} light={light} />
        {showWordmark && wordmark}
        {showTagline && <Tagline size={wordSize} light={light} />}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 select-none" {...rest}>
      <OraMark size={orbSize} light={light} />
      {showWordmark && (
        <span className="inline-flex flex-col">
          {wordmark}
          {showTagline && <Tagline size={wordSize} light={light} />}
        </span>
      )}
    </span>
  );
}

/** Tagline with flanking rules: "One AI. Every Conversation." */
function Tagline({ size = 24, light = false }) {
  return (
    <span
      className="mt-1 inline-flex items-center gap-1.5"
      style={{ fontSize: Math.max(9, size * 0.34) }}
    >
      <span className="h-px w-3" style={{ background: light ? "#7DD3FC" : "#1E73E8" }} />
      <span
        className="font-semibold tracking-tight whitespace-nowrap"
        style={{ color: light ? "rgba(255,255,255,0.75)" : "#475569" }}
      >
        One AI. Every Conversation.
      </span>
      <span className="h-px w-3" style={{ background: light ? "#7DD3FC" : "#1E73E8" }} />
    </span>
  );
}

export default Logo;
