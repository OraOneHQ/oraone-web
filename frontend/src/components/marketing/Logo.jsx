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
  // wide spiral gap (rim -> hole) — gives the 3-blade aperture / vortex look
  const slit = "M 20 2.6 C 28 4 32 9 31.6 15.4 C 31.3 19 27.6 21 24.4 20.4";
  const cut = light ? "rgba(15,23,42,0.92)" : "#FFFFFF";
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
        <linearGradient id={`${gid}-g`} x1="4" y1="6" x2="35" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19C2FF" />
          <stop offset="0.42" stopColor="#2C6BFF" />
          <stop offset="1" stopColor="#8B2FE6" />
        </linearGradient>
      </defs>

      {/* gradient disk */}
      <circle cx="20" cy="20" r="18" fill={light ? "#FFFFFF" : `url(#${gid}-g)`} />
      {/* three white spiral gaps -> aperture blades */}
      <g stroke={cut} strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d={slit} />
        <path d={slit} transform="rotate(120 20 20)" />
        <path d={slit} transform="rotate(240 20 20)" />
      </g>
      {/* round center hole */}
      <circle cx="20" cy="20" r="6.6" fill={cut} />
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
      <span style={{ color: light ? "#7DD3FC" : "#1E73E8" }}> One</span>
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
