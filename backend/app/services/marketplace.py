"""AI Marketplace catalogue (Phase Z).

A curated, in-code catalogue of installable building blocks so tenants can go
from zero to a working agent in one click. Keeping the catalogue in code (like
the Prompt Studio industry templates) means no seed data or extra table — we
only persist *installations*.

Categories
----------
* ``agent_template`` — a ready-made business agent (installs a real Agent).
* ``integration``    — a third-party connector blueprint.
* ``workflow``       — an automation recipe.
"""
from __future__ import annotations

from typing import Any, Optional

CATEGORIES = [
    {"value": "agent_template", "label": "Agent Templates"},
    {"value": "integration", "label": "Integrations"},
    {"value": "workflow", "label": "Workflows"},
]
_CATEGORY_VALUES = {c["value"] for c in CATEGORIES}


def _agent(slug, name, summary, icon, tags, system_prompt, greeting, *, featured=False,
           voice="emma", language="en", model="gpt-4o-mini",
           knowledge=None, workflow=None, integrations=None, pipeline=None,
           theme=None, analytics=None):
    """A full-stack business template.

    Installing it provisions a real :class:`Agent` (+config) and a starter
    :class:`KnowledgeBase`; the remaining stack (workflow, widget theme,
    suggested integrations, lead pipeline, analytics) is declared in the
    blueprint so the UI can show exactly what a one-click install sets up.
    """
    return {
        "slug": slug,
        "name": name,
        "category": "agent_template",
        "summary": summary,
        "icon": icon,
        "tags": tags,
        "author": "OraOne",
        "featured": featured,
        "blueprint": {
            "system_prompt": system_prompt,
            "greeting": greeting,
            "voice": voice,
            "language": language,
            "model": model,
            "knowledge_structure": knowledge or ["FAQs", "Pricing", "Policies", "Services"],
            "workflow": workflow or {"trigger": "lead.created", "steps": ["wait_1h", "whatsapp", "email"]},
            "suggested_integrations": integrations or ["google_calendar", "hubspot", "whatsapp"],
            "lead_pipeline": pipeline or ["New", "Contacted", "Qualified", "Won", "Lost"],
            "widget_theme": theme or {"primary": "#4F46E5", "launcher": "chat", "position": "bottom-right", "dark_mode": True},
            "analytics_dashboard": analytics or ["Conversations", "Leads", "Conversion %", "CSAT", "Avg handle time"],
        },
    }


# ─────────────────────────────── catalogue ───────────────────────────────────
LISTINGS: list[dict[str, Any]] = [
    _agent(
        "dental-clinic-ai", "Dental Clinic AI",
        "Books appointments, answers treatment questions and captures new patients.",
        "🦷", ["healthcare", "appointments", "receptionist"],
        "You are a warm, professional member of the front desk team at a dental clinic. "
        "Help callers book or reschedule appointments, answer questions about common "
        "treatments and pricing ranges, and capture new-patient details. Confirm names, "
        "phone numbers and times by reading them back. Never give clinical diagnoses.",
        "Hi, thanks for calling! How can I help you with your dental care today?",
        featured=True,
    ),
    _agent(
        "real-estate-ai", "Real Estate AI",
        "Qualifies buyers, books viewings and follows up on listings.",
        "🏠", ["real-estate", "sales", "lead-gen"],
        "You are a friendly real-estate sales associate. Qualify the caller's budget, "
        "location and timeline, match them to suitable listings, and book property "
        "viewings. Capture full contact details and the property of interest.",
        "Hi there! Are you looking to buy, sell or rent today?",
        featured=True,
    ),
    _agent(
        "restaurant-ai", "Restaurant Reservations AI",
        "Takes table bookings, answers menu questions and handles waitlists.",
        "🍽️", ["hospitality", "bookings"],
        "You are a courteous host at a restaurant. Take and confirm table reservations "
        "(date, time, party size, name and phone), answer questions about the menu, "
        "hours and dietary options, and manage the waitlist politely.",
        "Hello! Thanks for calling. Would you like to make a reservation?",
    ),
    _agent(
        "ecommerce-support-ai", "E-commerce Support AI",
        "Tracks orders, handles returns and answers product questions.",
        "🛍️", ["ecommerce", "support"],
        "You are a helpful customer-support specialist for an online store. Help with "
        "order status, returns and exchanges, shipping timelines and product questions. "
        "Verify the order reference and the customer's email before sharing details.",
        "Hi! I can help with your order, a return or any product question — what do you need?",
        featured=True,
    ),
    _agent(
        "clinic-reminder-ai", "Healthcare Reminder AI",
        "Confirms appointments, sends reminders and reduces no-shows.",
        "🩺", ["healthcare", "outbound", "reminders"],
        "You are a caring clinic coordinator calling to confirm an upcoming appointment. "
        "Confirm the date and time, offer to reschedule if needed, and answer simple "
        "preparation questions. Keep it brief and reassuring.",
        "Hello, I'm calling to confirm your upcoming appointment — is now a good time?",
    ),
    _agent(
        "loan-collections-ai", "Loan & EMI Reminder AI",
        "Politely reminds customers of due payments and shares payment links.",
        "💳", ["finance", "collections", "payments"],
        "You are a polite accounts associate reminding a customer about an upcoming or "
        "overdue payment. Confirm their identity, state the amount and due date clearly, "
        "offer to send a secure payment link, and never use pressure or threats.",
        "Hi, I'm calling about your account — do you have a quick moment?",
    ),
    _agent(
        "saas-onboarding-ai", "SaaS Onboarding AI",
        "Welcomes new signups, books demos and answers product questions.",
        "💻", ["saas", "onboarding", "sales"],
        "You are a friendly product specialist for a software company. Welcome new "
        "signups, understand their use-case, answer questions about features and "
        "pricing tiers, and book a demo with the right specialist.",
        "Hey! Welcome aboard. Want a quick hand getting set up, or shall I book you a demo?",
    ),
    _agent(
        "education-admissions-ai", "Education Admissions AI",
        "Answers course questions, captures applicants and books counselling.",
        "🎓", ["education", "admissions", "lead-gen"],
        "You are a helpful admissions advisor. Answer questions about courses, fees and "
        "schedules, capture the prospective student's details and goals, and book a "
        "counselling session. Be encouraging and clear.",
        "Hi! Are you exploring a course with us? I'd be happy to help.",
    ),
    _agent(
        "hospital-ai", "Hospital Front Desk AI",
        "Routes patients, books OPD slots and answers department queries.",
        "🏥", ["healthcare", "hospital", "appointments"],
        "You are a calm, reassuring hospital front-desk coordinator. Help callers find the "
        "right department, book OPD appointments, share visiting hours and answer general "
        "facility questions. Capture patient name, phone and reason for visit. Never give "
        "medical advice or diagnoses — escalate clinical questions to staff.",
        "Hello, thank you for calling. Which department or doctor can I help you reach?",
        knowledge=["Departments", "Doctors & Schedules", "Visiting Hours", "Insurance & Billing", "Emergency Info"],
        pipeline=["Enquiry", "Appointment Booked", "Visited", "Follow-up"],
        analytics=["OPD bookings", "No-show rate", "Department load", "Patient CSAT"],
    ),
    _agent(
        "pharmacy-ai", "Pharmacy Assistant AI",
        "Checks stock, takes refill requests and answers medicine questions.",
        "💊", ["healthcare", "pharmacy", "retail"],
        "You are a helpful pharmacy assistant. Take prescription refill requests, check "
        "product availability, share pricing and store hours, and arrange pickup or "
        "delivery. Confirm the patient's name and phone. Never advise on dosage or "
        "substitutions — direct those to the pharmacist.",
        "Hi! Do you need a refill, a product, or have a question for the pharmacy?",
        knowledge=["Products & Stock", "Refill Policy", "Delivery", "Store Hours"],
        integrations=["whatsapp", "google_calendar"],
        pipeline=["Request", "Confirmed", "Ready", "Collected"],
    ),
    _agent(
        "insurance-ai", "Insurance Advisor AI",
        "Qualifies prospects, explains policies and books advisor calls.",
        "🛡️", ["insurance", "sales", "lead-gen"],
        "You are a clear, trustworthy insurance advisor. Understand the caller's needs "
        "(life, health, motor, property), explain plan options and coverage in simple "
        "terms, capture their details, and book a call with a licensed advisor. Never "
        "make guarantees about claims outcomes.",
        "Hi! Are you looking for health, motor, life or property cover today?",
        featured=True,
        knowledge=["Plans & Coverage", "Premium Calculator", "Claims Process", "Eligibility"],
        pipeline=["Lead", "Qualified", "Quoted", "Policy Issued", "Lost"],
        analytics=["Quotes", "Conversion %", "Premium value", "Renewals"],
    ),
    _agent(
        "banking-ai", "Banking Support AI",
        "Answers account questions, helps with cards and books branch visits.",
        "🏦", ["banking", "finance", "support"],
        "You are a professional, security-conscious banking assistant. Help with account "
        "queries, card services, branch and ATM locations and appointment booking. Always "
        "verify identity before sharing any account-specific detail and never ask for full "
        "card numbers, PINs or passwords.",
        "Hello, thanks for calling. How can I help with your account today?",
        knowledge=["Products", "Cards", "Branches & ATMs", "Security & KYC", "Fees"],
        pipeline=["Enquiry", "Verified", "Resolved", "Escalated"],
    ),
    _agent(
        "automobile-ai", "Automobile Dealership AI",
        "Books test drives, qualifies buyers and schedules service.",
        "🚗", ["automobile", "sales", "service"],
        "You are an enthusiastic automobile dealership associate. Help callers book test "
        "drives, compare models and finance options, and schedule service appointments. "
        "Capture name, phone, model of interest and preferred time.",
        "Hi! Are you interested in a new vehicle, a test drive, or booking a service?",
        knowledge=["Models & Pricing", "Finance & EMI", "Test Drives", "Service & Warranty"],
        pipeline=["Lead", "Test Drive", "Negotiation", "Sold", "Lost"],
        analytics=["Test drives", "Conversion %", "Avg deal value", "Service bookings"],
    ),
    _agent(
        "hotel-ai", "Hotel Concierge AI",
        "Handles room bookings, answers amenity questions and upsells stays.",
        "🏨", ["hospitality", "hotel", "bookings"],
        "You are a gracious hotel concierge. Take and confirm room reservations (dates, "
        "room type, guests, name, phone), answer questions about amenities, dining and "
        "check-in, and suggest upgrades politely.",
        "Welcome! Would you like to check availability or book a room with us?",
        knowledge=["Rooms & Rates", "Amenities", "Dining", "Policies", "Local Guide"],
        pipeline=["Enquiry", "Booked", "Checked-in", "Checked-out"],
    ),
    _agent(
        "travel-ai", "Travel Booking AI",
        "Plans trips, quotes packages and captures travellers.",
        "✈️", ["travel", "sales", "bookings"],
        "You are a knowledgeable travel consultant. Understand the traveller's "
        "destination, dates, budget and party size, suggest suitable packages, and "
        "capture their contact details to send a tailored quote.",
        "Hi! Where are you dreaming of travelling to?",
        knowledge=["Destinations", "Packages & Pricing", "Visa Info", "Policies"],
        pipeline=["Enquiry", "Quoted", "Booked", "Travelled"],
    ),
    _agent(
        "coaching-ai", "Coaching & Training AI",
        "Enrols learners, explains programmes and books trial classes.",
        "🎯", ["education", "coaching", "lead-gen"],
        "You are a motivating coaching-institute advisor. Explain courses, batches and "
        "fees, understand the learner's goals, capture their details and book a free "
        "trial class or counselling session.",
        "Hi! Which course or skill are you looking to master?",
        knowledge=["Courses & Batches", "Fees & Offers", "Faculty", "Results"],
        pipeline=["Enquiry", "Trial Booked", "Enrolled", "Lost"],
    ),
    _agent(
        "university-ai", "University Admissions AI",
        "Guides applicants, explains programmes and books campus visits.",
        "🏛️", ["education", "university", "admissions"],
        "You are a helpful university admissions counsellor. Explain programmes, "
        "eligibility, fees and scholarships, capture applicant details and intended "
        "programme, and book a counselling call or campus visit.",
        "Hello! Are you exploring undergraduate or postgraduate programmes with us?",
        knowledge=["Programmes", "Eligibility & Fees", "Scholarships", "Campus Life", "Application Process"],
        pipeline=["Enquiry", "Applied", "Offer", "Enrolled", "Declined"],
    ),
    _agent(
        "logistics-ai", "Logistics & Freight AI",
        "Quotes shipments, tracks freight and books pickups.",
        "📦", ["logistics", "operations", "support"],
        "You are an efficient logistics coordinator. Quote shipments by origin, "
        "destination, weight and service level, track existing consignments, and book "
        "pickups. Confirm the consignment or order reference before sharing status.",
        "Hi! Do you need a shipping quote, a pickup, or a tracking update?",
        knowledge=["Services & Rates", "Coverage", "Tracking", "Documentation"],
        pipeline=["Quote", "Booked", "In Transit", "Delivered"],
    ),
    _agent(
        "courier-ai", "Courier Support AI",
        "Tracks parcels, reschedules delivery and handles complaints.",
        "🚚", ["logistics", "courier", "support"],
        "You are a friendly courier support agent. Help customers track parcels, "
        "reschedule or redirect deliveries, and log complaints. Verify the tracking "
        "number and recipient before sharing delivery details.",
        "Hi! Share your tracking number and I'll help with your parcel.",
        knowledge=["Tracking", "Delivery Options", "Returns", "Complaints"],
        pipeline=["Open", "In Progress", "Resolved"],
    ),
    _agent(
        "retail-ai", "Retail Store AI",
        "Checks stock, shares offers and books in-store appointments.",
        "🛒", ["retail", "sales", "support"],
        "You are a cheerful retail store assistant. Check product availability, share "
        "current offers and store hours, and book personal-shopping or pickup "
        "appointments. Capture the customer's name and phone.",
        "Hi! Looking for a product, an offer, or store info today?",
        knowledge=["Products & Stock", "Offers", "Store Hours", "Returns"],
        pipeline=["Enquiry", "Reserved", "Purchased"],
    ),
    _agent(
        "construction-ai", "Construction & Contracting AI",
        "Qualifies projects, books site visits and shares estimates.",
        "🏗️", ["construction", "sales", "lead-gen"],
        "You are a professional construction-firm associate. Understand the project type, "
        "scope, location and timeline, capture the client's details, and book a site "
        "survey or estimate call. Avoid committing to firm prices without a survey.",
        "Hi! Tell me about your project — what are you looking to build or renovate?",
        knowledge=["Services", "Past Projects", "Process", "Estimates"],
        pipeline=["Lead", "Site Visit", "Quoted", "Won", "Lost"],
    ),
    _agent(
        "legal-ai", "Legal Practice AI",
        "Screens enquiries, explains services and books consultations.",
        "⚖️", ["legal", "professional", "lead-gen"],
        "You are a discreet, professional legal-practice receptionist. Understand the "
        "nature of the enquiry at a high level, explain practice areas and consultation "
        "fees, capture contact details, and book a consultation. Never provide legal "
        "advice — only information and scheduling.",
        "Hello, thank you for calling. May I ask what matter you need assistance with?",
        knowledge=["Practice Areas", "Consultation Fees", "Process", "FAQs"],
        pipeline=["Enquiry", "Consultation", "Retained", "Closed"],
    ),
    _agent(
        "recruitment-ai", "Recruitment & Staffing AI",
        "Screens candidates, books interviews and answers job queries.",
        "🧑‍💼", ["recruitment", "hr", "lead-gen"],
        "You are an upbeat recruitment coordinator. Answer questions about open roles, "
        "screen candidates against basic criteria, capture their details and CV, and "
        "book interview slots. Be inclusive and professional.",
        "Hi! Are you calling about a specific role or exploring opportunities?",
        knowledge=["Open Roles", "Requirements", "Hiring Process", "FAQs"],
        pipeline=["Applied", "Screened", "Interview", "Offer", "Hired"],
        analytics=["Applicants", "Interview rate", "Time to hire", "Offer accept %"],
    ),
    _agent(
        "hr-helpdesk-ai", "HR Helpdesk AI",
        "Answers employee policy questions and logs HR requests.",
        "👥", ["hr", "support", "internal"],
        "You are a supportive internal HR helpdesk assistant. Answer employee questions "
        "about leave, payroll, benefits and policies, and log requests for the HR team. "
        "Verify the employee's name and ID and keep sensitive details confidential.",
        "Hi! How can the HR helpdesk help you today?",
        knowledge=["Leave & Attendance", "Payroll", "Benefits", "Policies", "IT & Access"],
        integrations=["slack", "google_calendar"],
        pipeline=["Open", "In Progress", "Resolved"],
    ),
    _agent(
        "manufacturing-ai", "Manufacturing Sales AI",
        "Handles RFQs, qualifies B2B buyers and routes to sales engineers.",
        "🏭", ["manufacturing", "b2b", "sales"],
        "You are a competent manufacturing inside-sales associate. Capture RFQ details "
        "(product, specs, quantity, timeline), qualify the buyer, and route serious "
        "enquiries to a sales engineer. Confirm company name and contact details.",
        "Hello! Are you looking for a quote or product information today?",
        knowledge=["Product Catalogue", "Capabilities", "Certifications", "Lead Times"],
        pipeline=["RFQ", "Qualified", "Quoted", "PO Received", "Lost"],
        analytics=["RFQs", "Quote value", "Win rate", "Avg lead time"],
    ),
    # ── integrations ──
    {
        "slug": "integration-google-calendar", "name": "Google Calendar",
        "category": "integration", "summary": "Sync appointments and bookings to Google Calendar.",
        "icon": "📅", "tags": ["calendar", "scheduling"], "author": "OraOne", "featured": False,
        "blueprint": {"provider": "google_calendar", "scopes": ["calendar.events"]},
    },
    {
        "slug": "integration-hubspot", "name": "HubSpot CRM",
        "category": "integration", "summary": "Push qualified leads and call notes into HubSpot.",
        "icon": "🧲", "tags": ["crm", "leads"], "author": "OraOne", "featured": True,
        "blueprint": {"provider": "hubspot", "objects": ["contacts", "deals"]},
    },
    {
        "slug": "integration-whatsapp", "name": "WhatsApp Business",
        "category": "integration", "summary": "Let your agent answer and follow up over WhatsApp.",
        "icon": "💬", "tags": ["whatsapp", "messaging"], "author": "OraOne", "featured": False,
        "blueprint": {"provider": "whatsapp", "channel": "whatsapp"},
    },
    # ── workflows ──
    {
        "slug": "workflow-lead-followup", "name": "Lead Follow-up Sequence",
        "category": "workflow", "summary": "Auto-follow-up new leads across WhatsApp and email.",
        "icon": "⚡", "tags": ["automation", "lead-gen"], "author": "OraOne", "featured": True,
        "blueprint": {"trigger": "lead.created", "steps": ["wait_1h", "whatsapp", "email"]},
    },
]

_BY_SLUG = {item["slug"]: item for item in LISTINGS}


def list_listings(category: Optional[str] = None, q: Optional[str] = None) -> list[dict[str, Any]]:
    """Return catalogue listings filtered by category and/or a search query."""
    items = LISTINGS
    if category and category in _CATEGORY_VALUES:
        items = [i for i in items if i["category"] == category]
    if q:
        needle = q.strip().lower()
        items = [
            i for i in items
            if needle in i["name"].lower()
            or needle in i["summary"].lower()
            or any(needle in t for t in i.get("tags", []))
        ]
    # Featured first, then alphabetical.
    return sorted(items, key=lambda i: (not i.get("featured"), i["name"].lower()))


def get_listing(slug: str) -> Optional[dict[str, Any]]:
    return _BY_SLUG.get(slug)
