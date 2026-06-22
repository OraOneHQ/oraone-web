import React from "react";
import SmartImg from "@/components/ui/SmartImg";

// Full brand logo (icon + wordmark + tagline) used in navbar / footer
export const BRAND_LOGO_URL = "/assets/image-4.png";
// Icon-only mark used in hero orb, loaders, CTA badges
export const BRAND_MARK_URL = "/assets/logo-icon.png";
export const BRAND_WORDMARK_URL = "/assets/logo-wordmark.png";

export function BrandMark() { return null; }
export function Logo({ className = "h-10 w-auto", ...rest }) {
	return (
		<SmartImg
			src={BRAND_LOGO_URL}
			alt="OraOne"
			className={className}
			eager
			draggable={false}
			{...rest}
		/>
	);
}
