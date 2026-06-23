import React from "react";
import * as simpleIcons from "simple-icons";

/**
 * SimpleIcon — render any brand icon from the `simple-icons` package as an SVG.
 *
 * Usage:
 *   <SimpleIcon slug="github" size={20} />
 *   <SimpleIcon slug="whatsapp" size={28} color="#25D366" />
 *   <SimpleIcon slug="google" useBrandColor />          // uses brand's official hex
 *   <SimpleIcon slug="x" size={20} color="currentColor" /> // inherits text color
 *
 * Props:
 *   slug          (string, required) — simple-icons slug, e.g. "github", "openai".
 *                                       See https://simpleicons.org for the full list.
 *   size          (number) — width & height in px. Default 20.
 *   color         (string) — CSS color. Default "currentColor" (inherits from parent).
 *   useBrandColor (bool)   — if true, uses the brand's official hex color.
 *   title         (string) — accessible title; defaults to the brand name.
 *   className     (string) — additional CSS classes.
 *   ...rest               — forwarded to the <svg> element.
 */
export default function SimpleIcon({
  slug,
  size = 20,
  color = "currentColor",
  useBrandColor = false,
  title,
  className = "",
  ...rest
}) {
  const key = `si${slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase()}`;
  const icon = simpleIcons[key];

  if (!icon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[SimpleIcon] No icon found for slug "${slug}" (looked up "${key}").`);
    }
    return null;
  }

  const fill = useBrandColor ? `#${icon.hex}` : color;

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      aria-label={title || icon.title}
      className={className}
      {...rest}
    >
      <title>{title || icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}