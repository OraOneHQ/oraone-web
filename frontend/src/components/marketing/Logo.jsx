import React from "react";

/* =========================================================================
   OraOne brand logo — faithful code-based (SVG) reproduction of the brand
   mark: a blue-gradient circular "C" that wraps a stylised "1" (C1 / O1),
   with the "Ora One" wordmark and optional tagline.

   Exports (kept backward-compatible with the previous logo):
     • <Logo />        full lockup (orb mark + "Ora One" wordmark [+ tagline])
     • <OraMark />     orb mark only
     • <BrandMark />   alias of OraMark
     • BRAND_LOGO_URL / BRAND_MARK_URL / BRAND_WORDMARK_URL (legacy fallbacks)
   ========================================================================= */

export const BRAND_LOGO_URL = "/assets/brand-logo.png";
export const BRAND_MARK_URL = "/assets/brand-logo.png";
export const BRAND_WORDMARK_URL = "/assets/brand-logo.png";

let uid = 0;
const nextId = () => `ora-${++uid}`;

/**
 * OraMark — the OraOne swirl/vortex mark (gradient disk with 3 white spiral
 * slits + a round center hole), matching the official brand logo.
 * `light` renders a flat white version for dark backgrounds.
 */
export function OraMark({ size = 40, className = "", light = false, ...rest }) {
  const gid = nextId();
  // "O1" monogram: a bold rounded "C"/open-ring (the O) wrapping a stylised "1".
  // Blue -> cyan brand gradient (no purple).
  const ring = light ? "#FFFFFF" : `url(#${gid}-ring)`;
  const one = light ? "rgba(255,255,255,0.92)" : `url(#${gid}-one)`;
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
        <linearGradient id={`${gid}-ring`} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D64E8" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={`${gid}-one`} x1="20" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3BC9F5" />
          <stop offset="1" stopColor="#18B4E6" />
        </linearGradient>
      </defs>

      {/* Open "C"/O ring — a near-full circle open on the right where the 1 sits */}
      <path
        d="M 28.6 7.7 A 15 15 0 1 0 28.6 32.3"
        stroke={ring}
        strokeWidth="5.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stylised "1" nested in the ring's opening */}
      <path
        d="M 20.8 14.4 L 24.7 11.9 L 24.7 29"
        stroke={one}
        strokeWidth="4.8"
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
