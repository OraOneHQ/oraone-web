import React from "react";

/* =========================================================================
   OraOne brand logo — faithful code-based (SVG) reproduction of the brand
   mark: a blue-gradient circular "O" that wraps a stylised "1" (O1 monogram),
   with the "Ora One" wordmark and optional tagline.

   This is the "v4" mark: a principal-designer-reviewed optical correction of
   the original ring+"1" monogram (single unified brand gradient across both
   strokes, heavier/rounder stroke weight, and a fuller bottom terminal) that
   keeps the mark reading correctly at small sizes without changing its
   fundamental geometry/identity. See docs/BRAND_GUIDELINES.md for the full
   rationale and asset hierarchy.

   Exports (kept backward-compatible with the previous logo):
     • <Logo />        full lockup (orb mark + "Ora One" wordmark [+ tagline])
     • <OraMark />     orb mark only (the master brand monogram, "v4")
     • <BrandMark />   alias of OraMark
     • <AppIcon />     monogram reversed to white inside a solid gradient
                       rounded-square tile — dedicated favicon/app-icon
                       derivative, NEVER used as the primary logo
     • BRAND_LOGO_URL / BRAND_MARK_URL / BRAND_WORDMARK_URL (legacy fallbacks)
   ========================================================================= */

export const BRAND_LOGO_URL = "/assets/brand-logo.png";
export const BRAND_MARK_URL = "/assets/brand-logo.png";
export const BRAND_WORDMARK_URL = "/assets/brand-logo.png";

let uid = 0;
const nextId = () => `ora-${++uid}`;

// Shared monogram path geometry (the "v4" optical correction) — kept as a
// single source of truth so <OraMark /> and <AppIcon /> never drift apart.
const MARK_RING_PATH = "M 27.2 8.6 A 14.2 14.2 0 1 0 27.2 31.4";
const MARK_ONE_PATH = "M 19.6 15.6 L 24.2 12.6 L 24.2 27.8";
const MARK_STROKE_WIDTH = 6.6;

/**
 * OraMark — the OraOne "O1" monogram (gradient ring wrapping a stylised "1"),
 * the master brand mark. `light` renders a flat white version for dark
 * backgrounds — same geometry, monochrome fill, never a redrawn shape.
 */
export function OraMark({ size = 40, className = "", light = false, ...rest }) {
  const gid = nextId();
  const stroke = light ? "#FFFFFF" : `url(#${gid}-mark)`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <linearGradient id={`${gid}-mark`} x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Open "O" ring — a near-full circle open on the right where the 1 sits */}
      <path d={MARK_RING_PATH} stroke={stroke} strokeWidth={MARK_STROKE_WIDTH} strokeLinecap="round" fill="none" />
      {/* Stylised "1" nested in the ring's opening */}
      <path
        d={MARK_ONE_PATH}
        stroke={stroke}
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Backward-compatible alias
export function BrandMark(props) {
  return <OraMark {...props} />;
}

/**
 * AppIcon — the OraOne monogram (reversed to white) inside a solid brand-
 * gradient rounded-square tile. This is the dedicated favicon/app-icon/PWA
 * derivative recommended after small-size legibility testing showed the bare
 * line-art monogram loses definition under ~32px. It is NOT an alternate
 * logo — only the master <OraMark /> should ever be called "the logo".
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
        <path d={MARK_RING_PATH} stroke="#FFFFFF" strokeWidth={MARK_STROKE_WIDTH + 0.8} strokeLinecap="round" fill="none" />
        <path
          d={MARK_ONE_PATH}
          stroke="#FFFFFF"
          strokeWidth={MARK_STROKE_WIDTH + 0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
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
