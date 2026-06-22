import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BRAND_MARK_URL } from "@/components/marketing/Logo";
import SmartImg from "@/components/ui/SmartImg";
import { MessageCircle, Phone, BarChart3, Star } from "lucide-react";

/**
 * AuthLayout — dark "channel orbit" left panel + white right form panel.
 *
 * Left panel:
 *   • Header: OraOne brand mark + wordmark + tagline
 *   • Headline (route-aware) with gradient
 *   • Description
 *   • Central scene: glowing 3D OraOne pedestal surrounded by 4 channel icons
 *     (Live Chat, WhatsApp, Voice Calls, Analytics) connected by dashed lines
 *   • Trust strip: avatars + "Trusted by 10,000+ users worldwide" + 4.9/5
 */
export default function AuthLayout() {
  const { pathname } = useLocation();
  const isSignup = pathname.startsWith("/signup");

  return (
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[#05060E]"
      data-testid="auth-layout-root"
    >
      {/* ============================== LEFT (DARK) ============================== */}
      <aside className="relative hidden lg:flex flex-col px-12 xl:px-16 py-10 text-white overflow-hidden">
        <Starfield />
        <div
          className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.32), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[560px] h-[560px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.28), transparent 65%)" }}
        />

        {/* Top: brand */}
        <Link to="/" className="relative z-10" data-testid="auth-brand-link" />

        {/* Headline + description */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 mt-10"
        >
          {isSignup ? (
            <>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1]">
                <span className="text-white">Create your account</span>
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg,#60A5FA,#A78BFA)" }}
                >
                  unlock smarter AI
                </span>
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed text-white/65 max-w-md">
                Join thousands of teams using OraOne to communicate smarter and get more done across
                every channel.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.1]">
                <span className="text-white">Welcome back to</span>
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg,#60A5FA,#A78BFA)" }}
                >
                  smarter conversations
                </span>
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed text-white/65 max-w-md">
                Log in to continue where you left off and unlock the power of AI with{" "}
                <span className="text-[#60A5FA]">OraOne.</span>
              </p>
            </>
          )}
        </motion.div>

        {/* Channel orbit scene — fills the remaining vertical space */}
        <div className="relative z-10 flex-1 mt-4 flex items-center justify-center">
          <ChannelOrbit />
        </div>

        {/* Trust strip */}
        <div className="relative z-10 flex items-center gap-4 mt-4">
          <div className="flex -space-x-3">
            {[12, 32, 47, 14].map((id) => (
              <SmartImg
                key={id}
                src={`https://i.pravatar.cc/64?img=${id}`}
                alt=""
                className="size-9 rounded-full border-2 border-[#05060E] object-cover"
              />
            ))}
          </div>
          <div>
            <p className="text-[13px] text-white/70 font-medium">
              Trusted by 10,000+ users worldwide
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} size={12} className="fill-[#FBBF24] text-[#FBBF24]" />
                ))}
              </div>
              <span className="text-[12px] text-white/80 font-semibold">4.9/5</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================== RIGHT (FORM) ============================== */}
      <main className="relative flex flex-col bg-white">
        <div className="flex-1 flex items-start lg:items-center justify-center px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
          <div className="w-full max-w-xl">
            <Link
              to="/"
              className="lg:hidden mb-8 inline-flex items-center gap-2.5"
              data-testid="auth-brand-link-mobile"
            >
              {/* brand mark placeholder */}
            </Link>

            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

/* =============================== Scene parts =============================== */

function Starfield() {
  const stars = [
    { l: 8, t: 14, s: 1 },   { l: 18, t: 30, s: 1.5 }, { l: 26, t: 8, s: 1 },
    { l: 40, t: 18, s: 1 },  { l: 52, t: 6, s: 1.5 },  { l: 64, t: 22, s: 1 },
    { l: 74, t: 14, s: 1 },  { l: 86, t: 28, s: 1.5 }, { l: 94, t: 10, s: 1 },
    { l: 6, t: 50, s: 1 },   { l: 22, t: 60, s: 1 },   { l: 42, t: 54, s: 1.5 },
    { l: 60, t: 66, s: 1 },  { l: 78, t: 58, s: 1 },   { l: 88, t: 72, s: 1.5 },
    { l: 12, t: 78, s: 1 },  { l: 30, t: 86, s: 1 },   { l: 50, t: 90, s: 1.5 },
    { l: 70, t: 82, s: 1 },  { l: 84, t: 94, s: 1 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{
            left: `${p.l}%`,
            top: `${p.t}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            opacity: 0.3 + (i % 3) * 0.18,
            boxShadow: "0 0 6px rgba(255,255,255,0.6)",
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------- Channel orbit (center scene) ----------------------- */

function ChannelOrbit() {
  // Layout coordinates (in % of the 520x440 viewBox the SVG uses)
  const ICONS = [
    {
      key: "chat",
      label: "Live Chat",
      icon: MessageCircle,
      pos: { left: "8%", top: "8%" },     // top-left
      grad: "from-[#7C3AED] to-[#4C1D95]",
      glow: "rgba(124,58,237,0.55)",
      line: { x1: 105, y1: 95,  x2: 240, y2: 200 },
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: WhatsAppGlyph,
      pos: { right: "8%", top: "8%" },    // top-right
      grad: "from-[#10B981] to-[#047857]",
      glow: "rgba(16,185,129,0.55)",
      line: { x1: 415, y1: 95,  x2: 280, y2: 200 },
    },
    {
      key: "voice",
      label: "Voice Calls",
      icon: Phone,
      pos: { left: "8%", bottom: "8%" },  // bottom-left
      grad: "from-[#F59E0B] to-[#92400E]",
      glow: "rgba(245,158,11,0.55)",
      line: { x1: 105, y1: 350, x2: 240, y2: 270 },
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: BarChart3,
      pos: { right: "8%", bottom: "8%" }, // bottom-right
      grad: "from-[#8B5CF6] to-[#5B21B6]",
      glow: "rgba(139,92,246,0.55)",
      line: { x1: 415, y1: 350, x2: 280, y2: 270 },
    },
  ];

  return (
    <div className="relative w-full max-w-[520px] aspect-[520/440]">
      {/* Dashed connection lines */}
      <svg
        viewBox="0 0 520 440"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
      >
        <defs>
          <linearGradient id="conn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {ICONS.map((it) => (
          <path
            key={it.key}
            d={`M ${it.line.x1} ${it.line.y1} Q ${(it.line.x1 + it.line.x2) / 2} ${
              (it.line.y1 + it.line.y2) / 2 + (it.line.y1 < 200 ? 20 : -20)
            } ${it.line.x2} ${it.line.y2}`}
            stroke="url(#conn)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />
        ))}
      </svg>

      {/* Channel icon tiles */}
      {ICONS.map((it, i) => (
        <motion.div
          key={it.key}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
          className="absolute flex flex-col items-center gap-2"
          style={it.pos}
        >
          <div
            className={`relative size-[72px] rounded-[18px] grid place-items-center bg-gradient-to-br ${it.grad} float-anim`}
            style={{
              boxShadow: `0 18px 40px -12px ${it.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            <it.icon size={28} className="text-white" strokeWidth={2} />
            {/* subtle gloss */}
            <span
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%)",
              }}
            />
          </div>
          <span className="text-[12.5px] text-white/75 font-medium">{it.label}</span>
        </motion.div>
      ))}

      {/* Center pedestal + 3D OraOne card */}
      <CenterPedestal />
    </div>
  );
}

function CenterPedestal() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
      {/* The 3D card (tall vertical) */}
      <div
        className="relative w-[120px] h-[150px] rounded-[22px] overflow-hidden shadow-[0_30px_60px_-18px_rgba(59,130,246,0.7),0_10px_40px_-10px_rgba(124,58,237,0.45)]"
        style={{
          transform: "perspective(800px) rotateY(-10deg) rotateX(4deg)",
          background:
            "linear-gradient(160deg,#1E40AF 0%,#2563EB 35%,#3B82F6 65%,#60A5FA 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        {/* brand mark placeholder */}
        {/* gloss */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)",
          }}
        />
      </div>

      {/* Pedestal disc */}
      <div className="relative -mt-3 w-[180px] h-12">
        <div
          className="absolute inset-x-0 bottom-0 h-10 rounded-[50%] blur-[3px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99,102,241,0.85) 0%, rgba(99,102,241,0.0) 70%)",
          }}
        />
        <div
          className="absolute inset-x-6 bottom-2 h-6 rounded-[50%]"
          style={{ background: "linear-gradient(180deg,#312E81,#0B1130)" }}
        />
        <div
          className="absolute inset-x-3 bottom-7 h-2 rounded-[50%]"
          style={{
            background: "linear-gradient(90deg, #A78BFA, #60A5FA, #A78BFA)",
            boxShadow: "0 0 22px 6px rgba(96,165,250,0.45)",
          }}
        />
      </div>
    </div>
  );
}

/* --------------------------- Inline brand glyphs --------------------------- */

function WhatsAppGlyph({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.84 11.84 0 0 0 12.06 0C5.53 0 .22 5.31.22 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.39-1.78a11.83 11.83 0 0 0 5.67 1.45h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.17-1.23-6.14-3.39-8.35ZM12.07 21.5h-.01a9.66 9.66 0 0 1-4.93-1.35l-.35-.21-3.79 1.06 1.07-3.69-.23-.37a9.66 9.66 0 0 1-1.5-5.1c0-5.34 4.35-9.69 9.69-9.69 2.59 0 5.02 1.01 6.85 2.84a9.62 9.62 0 0 1 2.84 6.86c0 5.34-4.35 9.65-9.64 9.65Zm5.31-7.23c-.29-.14-1.72-.85-1.99-.95-.27-.1-.46-.14-.66.14-.19.29-.76.95-.94 1.14-.17.19-.34.21-.63.07-.29-.14-1.22-.45-2.33-1.43a8.78 8.78 0 0 1-1.62-2c-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5l-.56-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.39 0 1.41 1.03 2.78 1.17 2.97.14.19 2.03 3.1 4.92 4.35.69.3 1.22.48 1.64.62.69.22 1.32.19 1.81.12.55-.08 1.72-.7 1.96-1.38.24-.69.24-1.27.17-1.39-.07-.12-.26-.19-.55-.34Z" />
    </svg>
  );
}
