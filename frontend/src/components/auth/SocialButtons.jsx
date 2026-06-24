import React from "react";
import { loginWithProvider } from "@/lib/cognito";

/* Inline brand marks so we never depend on a flaky icon CDN. */
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function MicrosoftIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

/**
 * SocialAuthButtons — Google / Microsoft via Cognito hosted UI.
 * `mode` is "login" or "signup" (passes screen_hint to the IdP flow).
 * Rendered as a 2-column row to match the mockup.
 */
export default function SocialAuthButtons({ mode = "login" }) {
  const btnCls =
    "inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition-all hover:bg-[#F8FAFC] hover:border-[#CBD5E1]";
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        data-testid="auth-google"
        onClick={() => loginWithProvider("Google", mode)}
        className={btnCls}
      >
        <GoogleIcon /> Google
      </button>
      <button
        type="button"
        data-testid="auth-microsoft"
        onClick={() => loginWithProvider("Microsoft", mode)}
        className={btnCls}
      >
        <MicrosoftIcon /> Microsoft
      </button>
    </div>
  );
}

/** OrDivider — labelled separator line shared by the auth forms. */
export function OrDivider({ label = "or continue with" }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#E2E8F0]" />
      <span className="whitespace-nowrap text-xs font-medium text-[#94A3B8]">{label}</span>
      <div className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  );
}
