// SEO landing pages — 6 high-conversion routes powered by SEOLanding template.
//
// /ai-voice-agent          /ai-chat-agent          /ai-whatsapp-agent
// /ai-lead-generation      /ai-appointment-booking /ai-customer-support

import React from "react";
import SEOLanding from "@/components/marketing/SEOLanding";
import {
  Phone, MessageSquare, MessageCircle, Users, Calendar, Headphones,
  Zap, ShieldCheck, Globe2, TrendingUp, Brain, BarChart3, Workflow,
  Clock, Smile, MapPin,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────── */
/* AI Voice Agent                                                     */
/* ────────────────────────────────────────────────────────────────── */
const VOICE_CONFIG = {
  slug: "ai-voice-agent",
  title: "AI Voice Agent for Inbound & Outbound Calls",
  description:
    "Deploy AI Voice Agents that answer calls 24/7, book appointments, qualify leads and route conversations — in 32+ languages, with human-grade voice quality.",
  eyebrow: "AI VOICE AGENT",
  h1: "Answer every call,",
  h1Accent: "even at 3 AM.",
  sub: "OraOne's AI Voice Agent handles inbound and outbound calls with human-level natural voice, books appointments, qualifies leads and writes back to your CRM — in 32+ languages.",
  metrics: [
    { value: "32+", label: "Languages supported" },
    { value: "<300ms", label: "Time-to-first-word" },
    { value: "98%", label: "Intent accuracy" },
    { value: "24/7", label: "Always answering" },
  ],
  benefits: [
    { icon: Zap, title: "Never miss a call", desc: "100% answer rate, 24/7. Overflow, after-hours and peak-time calls handled instantly." },
    { icon: Brain, title: "Human-grade voice", desc: "Sub-300ms latency with natural pauses, intonation and emotion — callers can't tell it's AI." },
    { icon: TrendingUp, title: "Higher conversion", desc: "Captures leads that would have hung up. Books appointments straight into your calendar." },
    { icon: ShieldCheck, title: "Enterprise-grade", desc: "GDPR-compliant, AES-256 encrypted, full call recordings and audit trails." },
    { icon: Globe2, title: "Multilingual", desc: "Switches languages mid-call. Native in Hindi, Tamil, Telugu, Spanish, Arabic and more." },
    { icon: Workflow, title: "Plug-and-play", desc: "Forwards from your existing number — no PBX changes, no porting needed to start." },
  ],
  features: [
    {
      icon: Phone, bg: "#EFF6FF",
      title: "Build call flows in minutes, not weeks",
      desc: "A visual flow builder for greetings, intents, escalations and fallbacks. Drag, drop, publish.",
      points: ["Visual flow builder with conditions", "AI-generated branching from a prompt", "A/B testing on greetings and prompts", "Per-agent business hours and queues"],
      tag: "FLOW STUDIO",
      previewTitle: "Call Flow Studio",
      previewDesc: "Greet → Identify → Capture → Book → Confirm.",
    },
    {
      icon: Calendar, bg: "#DCFCE7", color: "#16A34A",
      title: "Book appointments straight to your calendar",
      desc: "Round-robin across calendars with buffers, blackouts and rescheduling — no double bookings.",
      points: ["Google / Outlook / Apple Calendar sync", "Round-robin across multiple users", "Auto-reschedule on no-show", "Reminder SMS / WhatsApp 24h before"],
      tag: "BOOKING ENGINE",
    },
    {
      icon: BarChart3, bg: "#EDE9FE", color: "#7C3AED",
      title: "Call analytics that drive revenue decisions",
      desc: "Real-time dashboards on volume, AHT, sentiment, conversion and revenue attribution.",
      points: ["Live sentiment per call", "Revenue attribution per lead source", "Recording, transcript and summary", "CSV / Webhook export of every call"],
      tag: "ANALYTICS",
    },
  ],
  industries: [
    { industry: "HEALTHCARE",  title: "Clinics & Hospitals",    desc: "Appointment booking, follow-ups, insurance verification and prescription refill requests." },
    { industry: "REAL ESTATE", title: "Property Buyers & Rent", desc: "Qualify leads, schedule site visits, share matching properties on WhatsApp." },
    { industry: "AUTOMOTIVE",  title: "Dealerships & Service",  desc: "Service booking, breakdown assistance, pickup-drop scheduling and insurance claims." },
    { industry: "FINANCE",     title: "Banks & NBFCs",          desc: "Loan applications, KYC reminders, EMI follow-ups and balance enquiries." },
    { industry: "HOSPITALITY", title: "Hotels & Restaurants",   desc: "Reservations, group bookings, room upgrades and special-occasion handling." },
    { industry: "EDUCATION",   title: "Schools & Coaching",     desc: "Admissions, fee reminders, parent-teacher meeting bookings and attendance alerts." },
  ],
  socialProof: [
    { author: "Dr. Priya Sharma", role: "Founder, Bright Smiles Dental", quote: "We never miss a booking. OraOne handles 80% of our calls and our front desk finally has time to focus on patients." },
    { author: "Rahul Mehta",      role: "Sales Head, Brightside Realty", quote: "Site-visit bookings went up 3× in two weeks. The Hindi voice is so natural buyers think it's our agent." },
    { author: "Sneha Iyer",       role: "Director, ServPro Auto",        quote: "After-hours service requests went from missed to recovered. We literally added a new revenue stream." },
  ],
  faqs: [
    { q: "How long does it take to go live?", a: "Most teams are live within 24 hours. We point your number at our gateway, you publish your flow, and that's it." },
    { q: "Will callers know it's AI?", a: "We disclose 'AI assistant' upfront — but voice quality is so natural we routinely hear callers ask to speak to it again." },
    { q: "Can it transfer to a human?", a: "Yes — at any point. Conditions: keyword, low confidence, customer ask, escalation rules or business hours." },
    { q: "Which Indian languages are supported?", a: "Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia, plus 22+ international languages." },
    { q: "Is my customer data secure?", a: "AES-256 at rest, TLS 1.3 in transit, GDPR/DPDP compliant, EU/India residency options, full audit logs and DSR workflows." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* AI Chat Agent                                                      */
/* ────────────────────────────────────────────────────────────────── */
const CHAT_CONFIG = {
  slug: "ai-chat-agent",
  title: "AI Chat Agent for Website & Apps",
  description:
    "AI Chat Agents that qualify leads, answer support tickets and book demos directly on your website — installs with one line of code.",
  eyebrow: "AI CHAT AGENT",
  h1: "Convert visitors,",
  h1Accent: "not just sessions.",
  sub: "OraOne's AI Chat Agent qualifies leads, answers questions from your knowledge base, books demos and hands off to humans — installed with one line of code.",
  metrics: [
    { value: "1-line", label: "Install" },
    { value: "90+", label: "Languages" },
    { value: "3×", label: "Lead conversion" },
    { value: "<1s", label: "First reply" },
  ],
  benefits: [
    { icon: Zap, title: "One-line install", desc: "Paste a single script. Works on React, Next.js, Vue, Shopify, WordPress and plain HTML." },
    { icon: Brain, title: "Trained on your docs", desc: "Upload PDFs, FAQs, Notion or your help center — agent answers in your tone." },
    { icon: TrendingUp, title: "Built-in lead capture", desc: "Forms with validation, hidden fields, CRM sync and qualification logic." },
    { icon: Workflow, title: "Smart handoff", desc: "Routes to humans on low confidence, frustration or specific keywords." },
    { icon: Globe2, title: "Auto-translate", desc: "Detects visitor language and replies natively — across 90+ languages." },
    { icon: ShieldCheck, title: "Privacy-first", desc: "No third-party trackers. Customer PII redacted from logs. GDPR-compliant." },
  ],
  features: [
    {
      icon: MessageSquare, bg: "#EFF6FF",
      title: "Embedded chat that matches your brand",
      desc: "Custom colours, fonts, avatars, position and triggers — feels native to your product.",
      points: ["Customisable widget UI", "Page-targeting and triggers", "Visitor identification & traits", "Proactive messages on intent"],
      tag: "WIDGET",
    },
    {
      icon: Brain, bg: "#EDE9FE", color: "#7C3AED",
      title: "Knowledge base that updates itself",
      desc: "Crawl your site, sync from Notion, upload PDFs — the agent re-trains automatically.",
      points: ["Website crawl & re-index nightly", "PDF / DOCX upload", "Notion / Help-Scout / Intercom sync", "Version control on prompts"],
      tag: "KNOWLEDGE",
    },
    {
      icon: Users, bg: "#DCFCE7", color: "#16A34A",
      title: "Lead qualification that fills your pipeline",
      desc: "BANT, MEDDIC or your own framework — the agent qualifies, scores and routes hot leads.",
      points: ["Qualification frameworks (BANT/MEDDIC)", "Auto-lead scoring 0–100", "HubSpot / Salesforce / Zoho sync", "Slack / Email alerts on hot leads"],
      tag: "LEADS",
    },
  ],
  industries: [
    { industry: "SAAS",       title: "B2B SaaS", desc: "Pricing-page chat, demo booking, free-trial activation and feature discovery." },
    { industry: "ECOMMERCE",  title: "DTC & Marketplaces", desc: "Order lookup, returns, sizing help and abandoned-cart recovery." },
    { industry: "EDUCATION",  title: "EdTech", desc: "Course recommendations, enrolment, fee assistance and parent FAQs." },
    { industry: "HEALTHCARE", title: "Health platforms", desc: "Symptom triage, doctor matching, appointment booking and insurance Q&A." },
    { industry: "FINANCE",    title: "Fintech & Banking", desc: "Loan eligibility, KYC guidance and product comparison." },
    { industry: "TRAVEL",     title: "Travel & Mobility", desc: "Itinerary changes, refund status, lounge access and rebooking." },
  ],
  socialProof: [
    { author: "Aarav Kapoor",  role: "CMO, Lumen Bank",     quote: "Our pricing-page demo bookings went 4× in 6 weeks. The qualification questions are spot on." },
    { author: "Tanya Reddy",   role: "Head of Support, GreenLeaf Edu", quote: "60% of tier-1 tickets resolved without a human. Our support team is finally happy." },
    { author: "Vikram Singh",  role: "Founder, Bloom Hotels", quote: "Multilingual chat means we capture international travellers we used to lose." },
  ],
  faqs: [
    { q: "How do I install the chat widget?", a: "Paste a single <script> tag before </body>. Or use our React / Next.js npm package for tighter integration." },
    { q: "Can the agent escalate to humans?", a: "Yes — Slack, MS Teams, Intercom, Front, Zendesk or our built-in inbox. Routes on confidence, keywords or rules." },
    { q: "Will it work with my CRM?", a: "Native integrations with HubSpot, Salesforce, Zoho, Pipedrive and any tool via webhook or Zapier." },
    { q: "Does it slow down my site?", a: "The script is 18KB gzipped, lazy-loaded, and rendered in an iframe — zero impact on Core Web Vitals." },
    { q: "Can I customise the look?", a: "Fully — colours, fonts, avatar, position, greeting, sound and dark/light mode all configurable." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* AI WhatsApp Agent                                                  */
/* ────────────────────────────────────────────────────────────────── */
const WA_CONFIG = {
  slug: "ai-whatsapp-agent",
  title: "AI WhatsApp Agent for Sales & Support",
  description:
    "Deploy AI Agents on WhatsApp Business — handle leads, support, broadcasts and templates with Meta-verified accounts.",
  eyebrow: "AI WHATSAPP AGENT",
  h1: "Where 2 billion people chat,",
  h1Accent: "your AI is too.",
  sub: "OraOne's AI WhatsApp Agent runs on your Meta-verified WhatsApp Business number — selling, supporting and broadcasting at scale.",
  metrics: [
    { value: "98%", label: "Open rate" },
    { value: "3s", label: "Avg reply time" },
    { value: "Meta", label: "Verified" },
    { value: "24/7", label: "Always on" },
  ],
  benefits: [
    { icon: MessageCircle, title: "Native WhatsApp UX", desc: "Looks like a teammate — buttons, lists, media, location, vCards and CTAs." },
    { icon: Zap, title: "Instant replies",       desc: "Sub-3-second responses around the clock, in any language WhatsApp supports." },
    { icon: Brain, title: "Context-aware",       desc: "Remembers conversation history, customer profile and previous orders." },
    { icon: TrendingUp, title: "Broadcasts that convert", desc: "Send approved templates to opt-in audiences. Track delivery, read and reply rates." },
    { icon: ShieldCheck, title: "Meta-verified",  desc: "Full BSP setup — Business Manager, green tick, template approval." },
    { icon: BarChart3, title: "Conversation analytics", desc: "Funnel from message → reply → lead → sale — with cohort insights." },
  ],
  features: [
    {
      icon: MessageCircle, bg: "#DCFCE7", color: "#16A34A",
      title: "End-to-end WhatsApp Business setup",
      desc: "We walk you through Meta verification, number provisioning and template approval.",
      points: ["Meta Business Manager onboarding", "BSP-grade infrastructure", "Phone number provision or port", "Green-tick application support"],
      tag: "ONBOARDING",
    },
    {
      icon: Workflow, bg: "#EFF6FF",
      title: "Automation rules & flows",
      desc: "Triggers on keywords, schedule or CRM events. Handoff to humans on demand.",
      points: ["Keyword & intent triggers", "Time-based campaigns", "Conditional routing", "Human handoff via inbox"],
      tag: "AUTOMATION",
    },
    {
      icon: TrendingUp, bg: "#EDE9FE", color: "#7C3AED",
      title: "Broadcasts & templates",
      desc: "Submit, approve and send approved templates to opted-in audiences at scale.",
      points: ["Template submission & approval", "Audience segmentation", "Delivery / read / reply analytics", "Campaign A/B testing"],
      tag: "BROADCAST",
    },
  ],
  industries: [
    { industry: "ECOMMERCE",   title: "Order tracking & support", desc: "Order status, returns, exchanges and abandoned-cart recovery." },
    { industry: "HEALTHCARE",  title: "Appointment reminders",    desc: "Booking, reminders, prescription refills and lab-report delivery." },
    { industry: "EDUCATION",   title: "Admissions & fees",        desc: "Course info, enrolment, fee reminders and parent updates." },
    { industry: "TRAVEL",      title: "Bookings & itineraries",   desc: "Ticket confirmations, gate changes and rebooking on disruptions." },
    { industry: "REAL ESTATE", title: "Property catalogues",       desc: "Share property cards, schedule visits and capture buyer intent." },
    { industry: "FINANCE",     title: "Loan & KYC follow-ups",     desc: "Document collection, EMI reminders and renewal nudges." },
  ],
  socialProof: [
    { author: "Riya Banerjee",   role: "Marketing Lead, Bloom Hotels", quote: "98% open rate on broadcast campaigns. We've moved most of our promos from email to WhatsApp." },
    { author: "Karthik Iyer",    role: "Operations, ServPro Auto",     quote: "Service reminders that used to be SMS are now WhatsApp — pick-up bookings doubled." },
    { author: "Anjali Verma",    role: "Founder, Acme Health",         quote: "Patient queries answered instantly on WhatsApp. Our reception staff is finally focusing on in-person care." },
  ],
  faqs: [
    { q: "Do I need to apply for WhatsApp Business?", a: "Yes — we walk you through Meta Business Manager onboarding. Most accounts are verified in 1–3 business days." },
    { q: "Can I keep my existing number?", a: "Yes — you can port your existing number or provision a fresh one. Both options take similar time." },
    { q: "Can I send marketing broadcasts?", a: "Yes — within Meta's policy. Templates need approval, and recipients must be opt-in. We handle the submission flow." },
    { q: "Can it handle rich media?", a: "Images, videos, documents, location, contacts, list messages, quick replies and CTA buttons — all supported." },
    { q: "What does it cost?", a: "WhatsApp charges per conversation (you pay Meta directly). OraOne is a flat monthly fee — no per-message markups." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* AI Lead Generation                                                  */
/* ────────────────────────────────────────────────────────────────── */
const LEADS_CONFIG = {
  slug: "ai-lead-generation",
  title: "AI Lead Generation Across Every Channel",
  description:
    "Capture, qualify and score leads across Voice, Chat and WhatsApp — auto-sync to your CRM with full attribution.",
  eyebrow: "AI LEAD GENERATION",
  h1: "Capture every lead,",
  h1Accent: "across every channel.",
  sub: "OraOne's AI agents capture, qualify and score leads across Voice, Chat and WhatsApp — auto-syncing to your CRM with full attribution.",
  metrics: [
    { value: "3×", label: "Lead conversion lift" },
    { value: "92%", label: "Qualification accuracy" },
    { value: "<1m", label: "CRM sync latency" },
    { value: "0", label: "Manual entry" },
  ],
  benefits: [
    { icon: Users, title: "Multi-channel capture", desc: "Single funnel across Voice, Chat and WhatsApp — same lead, same scoring." },
    { icon: Brain, title: "Smart qualification", desc: "BANT, MEDDIC or your custom framework — agents ask only what's needed." },
    { icon: TrendingUp, title: "Auto-scoring 0–100", desc: "Combines intent, urgency, fit and behaviour into a single score." },
    { icon: Workflow, title: "Two-way CRM sync", desc: "HubSpot, Salesforce, Zoho, Pipedrive — leads flow both ways in real time." },
    { icon: Zap, title: "Hot-lead alerts", desc: "Slack / SMS / Email when a lead crosses your threshold." },
    { icon: BarChart3, title: "Attribution at source", desc: "Every lead carries its first touch, UTM and conversation transcript." },
  ],
  features: [
    {
      icon: Users, bg: "#EFF6FF",
      title: "Forms that adapt to your funnel",
      desc: "Conditional fields, validation, hidden UTMs and progressive profiling.",
      points: ["Conditional logic per field", "Phone, email, OTP validation", "Hidden UTM / referrer capture", "Progressive profiling across visits"],
      tag: "CAPTURE",
    },
    {
      icon: Brain, bg: "#EDE9FE", color: "#7C3AED",
      title: "Qualification powered by AI",
      desc: "The agent asks the right questions in the right order — and stops when it has enough.",
      points: ["BANT / MEDDIC / custom frameworks", "Multi-turn natural dialogue", "Industry-specific prompts", "Deflects when not qualified"],
      tag: "QUALIFY",
    },
    {
      icon: Workflow, bg: "#DCFCE7", color: "#16A34A",
      title: "Auto-sync to your CRM",
      desc: "Real-time push to HubSpot, Salesforce, Zoho — with field mapping, dedupe and ownership rules.",
      points: ["Native CRM integrations", "Field mapping UI", "Dedupe by email / phone / domain", "Round-robin or rule-based ownership"],
      tag: "SYNC",
    },
  ],
  industries: [
    { industry: "REAL ESTATE", title: "Buyer & investor leads",        desc: "Capture from listings, ads and walk-ins — qualified by budget, location, timeline." },
    { industry: "SAAS",        title: "Demo & trial requests",         desc: "Pricing-page and ad leads qualified by company size, role and use case." },
    { industry: "EDUCATION",   title: "Admission enquiries",           desc: "Course interest, scholarship eligibility and parent contact capture." },
    { industry: "FINANCE",     title: "Loan & insurance",              desc: "Eligibility-driven qualification with KYC kick-off." },
    { industry: "AUTOMOTIVE",  title: "Test drives & service",         desc: "Model preference, location and intent-to-buy timeline." },
    { industry: "B2B",         title: "Enterprise outbound",           desc: "Cold-lead qualification before SDR engagement." },
  ],
  socialProof: [
    { author: "Aman Khurana", role: "VP Sales, Lumen Bank", quote: "Our cost per qualified lead dropped 40% in 90 days. The hand-off to RMs is friction-free now." },
    { author: "Pooja Nair",   role: "Marketing Director, GreenLeaf Edu", quote: "We finally have a single funnel across web, WhatsApp and calls — with proper attribution." },
    { author: "Rajiv Menon",  role: "Founder, Brightside Realty", quote: "Hot leads ping our team on Slack with full context — site visits started doubling in week 3." },
  ],
  faqs: [
    { q: "How does scoring work?", a: "Each lead carries a 0–100 score combining intent signals (questions asked), fit (industry, role, size) and behaviour (pages visited, session depth)." },
    { q: "Which CRMs are supported natively?", a: "HubSpot, Salesforce, Zoho, Pipedrive, Freshsales out of the box. Any CRM via webhook or Zapier." },
    { q: "Can leads carry the full conversation?", a: "Yes — transcripts, summaries, sentiment and call recordings are attached to every lead record." },
    { q: "Can I de-duplicate leads?", a: "Yes — by email, phone, domain or any custom field. Ownership rules ensure no two reps race on the same lead." },
    { q: "Is GDPR / DPDP supported?", a: "Yes — consent capture, audit logs, DSR workflows and EU/India data residency are all available." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* AI Appointment Booking                                              */
/* ────────────────────────────────────────────────────────────────── */
const APPT_CONFIG = {
  slug: "ai-appointment-booking",
  title: "AI Appointment Booking for Service Businesses",
  description:
    "AI agents that book, reschedule and remind customers about appointments — directly into your team's calendars.",
  eyebrow: "AI APPOINTMENT BOOKING",
  h1: "Bookings that close",
  h1Accent: "themselves.",
  sub: "OraOne's AI books, reschedules and reminds customers about appointments — across Voice, Chat and WhatsApp — straight into your team's calendars.",
  metrics: [
    { value: "60%", label: "Fewer no-shows" },
    { value: "3×", label: "More bookings" },
    { value: "0", label: "Double-bookings" },
    { value: "24/7", label: "Booking window" },
  ],
  benefits: [
    { icon: Calendar, title: "Calendar-native", desc: "Google, Outlook and Apple Calendar with real-time availability." },
    { icon: Clock, title: "Smart slots", desc: "Auto-buffers, blackout windows, lunch breaks and per-rep schedules respected." },
    { icon: Users, title: "Round-robin", desc: "Distribute bookings fairly across your team based on rules." },
    { icon: MessageCircle, title: "Reminder cadence", desc: "WhatsApp + SMS reminders cut no-shows by 60%." },
    { icon: MapPin, title: "Location-aware", desc: "Pick a clinic / store / showroom branch nearest to the customer." },
    { icon: ShieldCheck, title: "Privacy-first", desc: "Customer PII protected with GDPR/DPDP compliance." },
  ],
  features: [
    {
      icon: Calendar, bg: "#EFF6FF",
      title: "Real-time availability across reps",
      desc: "OraOne reads your team's calendars and offers only truly-available slots.",
      points: ["Google / Outlook / Apple sync", "Round-robin or rule-based routing", "Buffers, lunch, blackouts respected", "Auto-reschedule on no-show"],
      tag: "AVAILABILITY",
    },
    {
      icon: MessageCircle, bg: "#DCFCE7", color: "#16A34A",
      title: "Reminders that actually arrive",
      desc: "Multi-channel reminders (WhatsApp, SMS, Email) cut no-shows dramatically.",
      points: ["24-hour & 1-hour reminders", "Auto-reschedule flow on conflict", "Multi-channel fallback", "Customer self-serve via link"],
      tag: "REMINDERS",
    },
    {
      icon: BarChart3, bg: "#EDE9FE", color: "#7C3AED",
      title: "Insights on bookings & no-shows",
      desc: "See booking sources, conversion, no-show patterns and revenue per booking.",
      points: ["Booking funnel by source", "No-show prediction model", "Revenue per booking", "Rep utilisation dashboard"],
      tag: "ANALYTICS",
    },
  ],
  industries: [
    { industry: "HEALTHCARE",  title: "Clinics & hospitals", desc: "Patient appointments, diagnostics and follow-ups across multiple locations." },
    { industry: "BEAUTY",      title: "Salons & spas",       desc: "Multi-service bookings, stylist preference and gift-card sales." },
    { industry: "AUTOMOTIVE",  title: "Service centres",     desc: "Service slots, pickup-drop and bay scheduling across branches." },
    { industry: "FITNESS",     title: "Gyms & studios",      desc: "Class bookings, trainer 1-on-1s and renewal nudges." },
    { industry: "EDUCATION",   title: "Tutoring & coaching", desc: "Demo lessons, parent-teacher meetings and exam prep slots." },
    { industry: "REAL ESTATE", title: "Property viewings",   desc: "Schedule site visits and broker tours with maps and travel time." },
  ],
  socialProof: [
    { author: "Dr. Anil Kapoor", role: "MD, Acme Health", quote: "No-shows dropped from 22% to 8% in two months. The WhatsApp reminder flow is gold." },
    { author: "Priya Shenoy",    role: "Owner, Bloom Salon", quote: "Booking link does 70% of the work. Stylists love that they pick when they're free." },
    { author: "Vikrant Joshi",   role: "GM, ServPro Auto", quote: "Pickup-drop bookings tripled. Customers love that they can book at midnight if they want." },
  ],
  faqs: [
    { q: "Can it book on multiple calendars?", a: "Yes — round-robin or rule-based across your whole team. Each rep keeps their own calendar source of truth." },
    { q: "What happens if I'm busy?", a: "OraOne reads availability in real time. Buffers, lunch and blackouts are respected — only truly-free slots are offered." },
    { q: "Can customers reschedule themselves?", a: "Yes — every confirmation includes a self-serve link to reschedule or cancel." },
    { q: "Does it work for multi-location businesses?", a: "Yes — customers can pick their nearest branch and the agent will only show that branch's availability." },
    { q: "Can I send my own reminder templates?", a: "Yes — fully customisable WhatsApp templates (Meta-approved), SMS and email." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* AI Customer Support                                                 */
/* ────────────────────────────────────────────────────────────────── */
const SUPPORT_CONFIG = {
  slug: "ai-customer-support",
  title: "AI Customer Support for 24/7 Service",
  description:
    "AI agents that handle tier-1 support across Voice, Chat and WhatsApp — and hand off seamlessly to humans when needed.",
  eyebrow: "AI CUSTOMER SUPPORT",
  h1: "Support that scales",
  h1Accent: "while your team sleeps.",
  sub: "OraOne handles tier-1 customer support across Voice, Chat and WhatsApp 24/7 — and escalates to your team with full context when needed.",
  metrics: [
    { value: "60%", label: "Tickets deflected" },
    { value: "<3s", label: "First response" },
    { value: "4.8★", label: "Customer rating" },
    { value: "24/7", label: "Coverage" },
  ],
  benefits: [
    { icon: Headphones, title: "24/7 multilingual", desc: "Never close, never wait — support across time-zones in 90+ languages." },
    { icon: Brain, title: "Trained on your KB", desc: "Reads your help center, returns policy and product docs — answers in your tone." },
    { icon: Workflow, title: "Smart escalation", desc: "Hands off to humans on emotion, complexity or explicit ask." },
    { icon: Smile, title: "Customer-first", desc: "Adapts tone to sentiment — empathetic on complaints, factual on info queries." },
    { icon: TrendingUp, title: "Deflection at scale", desc: "Resolves tier-1 instantly — your humans focus on the queries that matter." },
    { icon: ShieldCheck, title: "Audit-ready", desc: "Every conversation logged, exportable and tamper-proof for compliance." },
  ],
  features: [
    {
      icon: Brain, bg: "#EFF6FF",
      title: "Knowledge that stays fresh",
      desc: "Crawl your help center, sync from Notion / Zendesk / Intercom — agent re-trains automatically.",
      points: ["Auto-crawl your help center", "Notion / Confluence / Zendesk sync", "Versioned KB with rollback", "Hot-fix prompts in seconds"],
      tag: "KNOWLEDGE",
    },
    {
      icon: Workflow, bg: "#DCFCE7", color: "#16A34A",
      title: "Escalation with full context",
      desc: "When a human takes over, the full conversation, sentiment and customer profile is right there.",
      points: ["Routes to Zendesk / Freshdesk / Help-Scout", "Full transcript and summary on handover", "Skills-based routing", "SLA breach alerts"],
      tag: "ESCALATION",
    },
    {
      icon: BarChart3, bg: "#EDE9FE", color: "#7C3AED",
      title: "CSAT, deflection & cost insights",
      desc: "Track resolution rate, CSAT, deflection and cost per ticket — across every channel.",
      points: ["Per-channel CSAT", "Deflection rate by topic", "Cost per ticket", "Top knowledge gaps surfaced"],
      tag: "ANALYTICS",
    },
  ],
  industries: [
    { industry: "SAAS",       title: "B2B & B2C SaaS",      desc: "Account setup, billing, integrations, troubleshooting and feature questions." },
    { industry: "ECOMMERCE",  title: "DTC & Marketplaces",  desc: "Order tracking, returns, sizing, exchanges and store credits." },
    { industry: "FINTECH",    title: "Banking & insurance", desc: "Balance, statements, claim status and KYC document collection." },
    { industry: "TRAVEL",     title: "Travel & mobility",   desc: "Rebooking, refunds, lounge access and disruption notifications." },
    { industry: "TELECOM",    title: "Telco & utilities",   desc: "Plan changes, outage queries and bill explanations." },
    { industry: "EDUCATION",  title: "EdTech & schools",    desc: "Course queries, fee status, exam schedules and parent FAQs." },
  ],
  socialProof: [
    { author: "Kiran Joshi",   role: "Head of Support, GreenLeaf Edu", quote: "60% tier-1 deflection in 90 days. Our team finally focuses on hard problems and not password resets." },
    { author: "Aditi Bhatia",  role: "VP CX, Bloom Hotels", quote: "Multilingual support across WhatsApp and Voice — guest satisfaction up 12 points." },
    { author: "Rohit Nanda",   role: "Director, ServPro Auto", quote: "Customers get instant answers on warranty and service queries — repeat business is up." },
  ],
  faqs: [
    { q: "Can it use my existing help center?", a: "Yes — auto-crawl your site, sync from Zendesk, Notion, Help-Scout, Intercom, Confluence or upload PDFs." },
    { q: "When does it escalate?", a: "On low confidence, customer frustration, explicit ask, specific keywords or SLA-bound topics like billing disputes." },
    { q: "Will agents pass back conversation history?", a: "Yes — when a human takes over, the full transcript, summary, sentiment and customer profile is on screen." },
    { q: "Can I measure deflection?", a: "Yes — per-channel and per-topic. Most teams hit 40–60% deflection on tier-1 within 60 days." },
    { q: "Is multilingual support built-in?", a: "Native in 90+ languages with auto-detection — switches mid-conversation if the user does." },
  ],
};

/* ────────────────────────────────────────────────────────────────── */
/* Page exports                                                       */
/* ────────────────────────────────────────────────────────────────── */
export function AIVoiceAgentPage()         { return <SEOLanding config={VOICE_CONFIG} />; }
export function AIChatAgentPage()          { return <SEOLanding config={CHAT_CONFIG} />; }
export function AIWhatsAppAgentPage()      { return <SEOLanding config={WA_CONFIG} />; }
export function AILeadGenerationPage()     { return <SEOLanding config={LEADS_CONFIG} />; }
export function AIAppointmentBookingPage() { return <SEOLanding config={APPT_CONFIG} />; }
export function AICustomerSupportPage()    { return <SEOLanding config={SUPPORT_CONFIG} />; }
