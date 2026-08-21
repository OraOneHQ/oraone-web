import React from "react";

/* =========================================================================
   OraOne brand logo — "Chat Spark": a rounded chat-bubble silhouette (the
   product category — AI chat/WhatsApp conversations) with a 4-point AI
   "spark" cut into it, in the brand blue -> cyan gradient.

   This replaces the earlier "O1" ring monogram, which user testing found
   too abstract/unclear as a standalone mark. Chat Spark reads instantly as
   "AI-powered conversation" even at favicon size, with no letterform to
   decode. See docs/FRONTEND.md for the full rationale.

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

// Shared mark geometry — kept as a single source of truth so <OraMark />
// and <AppIcon /> never drift apart.
const BUBBLE_PATH =
  "M20 4C10.6 4 3 10.8 3 19.2c0 4.6 2.3 8.7 5.9 11.5-.3 2.1-1.2 4.3-2.6 6 2.9-.2 5.5-1.3 7.6-2.9 1.9.6 4 .9 6.1.9 9.4 0 17-6.8 17-15.2S29.4 4 20 4z";
const SPARK_PATH = "M27.5 11l1.7 4.1 4.1 1.7-4.1 1.7-1.7 4.1-1.7-4.1-4.1-1.7 4.1-1.7z";

/**
 * OraMark — the OraOne "Chat Spark" mark (gradient speech bubble + AI
 * spark), the master brand mark. `light` renders a flat white version for
 * dark backgrounds — same geometry, monochrome fill, never a redrawn shape.
 */
export function OraMark({ size = 40, className = "", light = false, ...rest }) {
  const gid = nextId();
  const bubbleFill = light ? "#FFFFFF" : `url(#${gid}-mark)`;
  const sparkFill = light ? "#0F172A" : "#FFFFFF";
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
      <path d={BUBBLE_PATH} fill={bubbleFill} />
      <path d={SPARK_PATH} fill={sparkFill} />
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
 * derivative for the smallest sizes (16-32px), where the bubble's spark
 * detail needs the extra contrast of a solid tile background. It is NOT an
 * alternate logo — only the master <OraMark /> should ever be called "the
 * logo".
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
        <path d={BUBBLE_PATH} fill="#FFFFFF" />
        <path d={SPARK_PATH} fill="#2563EB" />
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
