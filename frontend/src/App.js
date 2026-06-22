import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import OraOneLoader from "@/components/ui/OraOneLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CookieConsent, { CookieSettingsTrigger } from "@/components/CookieConsent";
import AnalyticsRouteTracker from "@/components/AnalyticsRouteTracker";

// Layouts (kept eager — small and shared)
import MarketingLayout from "@/layouts/MarketingLayout";
import AuthLayout from "@/layouts/AuthLayout";
import OnboardingLayout from "@/layouts/OnboardingLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

// Home stays eager for the fastest LCP on the most-visited route
import Home from "@/pages/marketing/Home";

// Marketing — lazy
const Products = lazy(() => import("@/pages/marketing/Products"));
const Solutions = lazy(() => import("@/pages/marketing/Solutions"));
const IntegrationsMkt = lazy(() => import("@/pages/marketing/Integrations"));
const Templates = lazy(() => import("@/pages/marketing/Templates"));
const Pricing = lazy(() => import("@/pages/marketing/Pricing"));
const Documentation = lazy(() => import("@/pages/marketing/Documentation"));
const CaseStudies = lazy(() => import("@/pages/marketing/CaseStudies"));
const About = lazy(() => import("@/pages/marketing/About"));
const Contact = lazy(() => import("@/pages/marketing/Contact"));
const Security = lazy(() => import("@/pages/marketing/Security"));
const Privacy = lazy(() => import("@/pages/legal/Legal").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/legal/Legal").then((m) => ({ default: m.Terms })));
const Cookie = lazy(() => import("@/pages/legal/Legal").then((m) => ({ default: m.Cookie })));
const DataDeletion = lazy(() => import("@/pages/legal/Legal").then((m) => ({ default: m.DataDeletion })));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ServerError = lazy(() => import("@/pages/ServerError"));
const NetworkError = lazy(() => import("@/pages/SystemPages").then((m) => ({ default: m.NetworkError })));
const Maintenance = lazy(() => import("@/pages/SystemPages").then((m) => ({ default: m.Maintenance })));
const LoaderShowcase = lazy(() => import("@/pages/LoaderShowcase"));

// SEO landing pages
const AIVoiceAgentPage         = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AIVoiceAgentPage })));
const AIChatAgentPage          = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AIChatAgentPage })));
const AIWhatsAppAgentPage      = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AIWhatsAppAgentPage })));
const AILeadGenerationPage     = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AILeadGenerationPage })));
const AIAppointmentBookingPage = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AIAppointmentBookingPage })));
const AICustomerSupportPage    = lazy(() => import("@/pages/marketing/SeoPages").then((m) => ({ default: m.AICustomerSupportPage })));

// Auth — lazy
const AuthCallback = lazy(() => import("@/pages/auth/AuthCallback"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const VerifyEmail = lazy(() => import("@/pages/auth/Recovery").then((m) => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import("@/pages/auth/Recovery").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/auth/Recovery").then((m) => ({ default: m.ResetPassword })));

// Onboarding — lazy
const Step1Agent = lazy(() => import("@/pages/onboarding/Step1Agent"));
const Step2Business = lazy(() => import("@/pages/onboarding/Step2Business"));
const Step3Channels = lazy(() => import("@/pages/onboarding/Step3Channels"));

// Dashboard — lazy (large, only authenticated users see this)
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const Agents = lazy(() => import("@/pages/dashboard/Agents"));
const AgentCreate = lazy(() => import("@/pages/dashboard/AgentCreate"));
const AgentBuilder = lazy(() => import("@/pages/dashboard/AgentBuilder"));
const Conversations = lazy(() => import("@/pages/dashboard/Conversations"));
const Leads = lazy(() => import("@/pages/dashboard/Leads"));
const Analytics = lazy(() => import("@/pages/dashboard/Analytics"));
const KnowledgeBase = lazy(() => import("@/pages/dashboard/KnowledgeBase"));
const KnowledgeBaseDetails = lazy(() => import("@/pages/dashboard/KnowledgeBaseDetails"));
const IntegrationsDash = lazy(() => import("@/pages/dashboard/Integrations"));
const Team = lazy(() => import("@/pages/dashboard/Team"));
const Settings = lazy(() => import("@/pages/dashboard/Settings"));

function RouteFallback() {
  return <OraOneLoader label="Loading page…" />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ErrorBoundary>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <AnalyticsRouteTracker />
          <CookieConsent />
          <CookieSettingsTrigger />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Marketing */}
              <Route element={<MarketingLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/solutions" element={<Solutions />} />
                <Route path="/integrations" element={<IntegrationsMkt />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/case-studies" element={<CaseStudies />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/security" element={<Security />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookie-policy" element={<Cookie />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                {/* SEO landing pages */}
                <Route path="/ai-voice-agent" element={<AIVoiceAgentPage />} />
                <Route path="/ai-chat-agent" element={<AIChatAgentPage />} />
                <Route path="/ai-whatsapp-agent" element={<AIWhatsAppAgentPage />} />
                <Route path="/ai-lead-generation" element={<AILeadGenerationPage />} />
                <Route path="/ai-appointment-booking" element={<AIAppointmentBookingPage />} />
                <Route path="/ai-customer-support" element={<AICustomerSupportPage />} />
                {/* System pages */}
                <Route path="/500" element={<ServerError />} />
                <Route path="/network-error" element={<NetworkError />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/__loaders" element={<LoaderShowcase />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Cognito Hosted UI callback — no layout wrapper, handles its own full-page UI */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Auth */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              {/* Onboarding */}
              <Route element={<OnboardingLayout />}>
                <Route path="/onboarding" element={<Navigate to="/onboarding/agent" replace />} />
                <Route path="/onboarding/agent" element={<Step1Agent />} />
                <Route path="/onboarding/business" element={<Step2Business />} />
                <Route path="/onboarding/channels" element={<Step3Channels />} />
              </Route>

              {/* Dashboard (protected) */}
              <Route element={<DashboardLayout />}>
                <Route path="/app" element={<Navigate to="/app/overview" replace />} />
                <Route path="/app/overview" element={<Overview />} />
                <Route path="/app/agents" element={<Agents />} />
                <Route path="/app/agents/new" element={<AgentCreate />} />
                <Route path="/app/agents/:id" element={<AgentBuilder />} />
                <Route path="/app/conversations" element={<Conversations />} />
                <Route path="/app/leads" element={<Leads />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/app/knowledge-base/:id" element={<KnowledgeBaseDetails />} />
                <Route path="/app/integrations" element={<IntegrationsDash />} />
                <Route path="/app/team" element={<Team />} />
                <Route path="/app/settings" element={<Settings />} />
                {/* protected aliases */}
                <Route path="/dashboard" element={<Navigate to="/app/overview" replace />} />
                <Route path="/dashboard/*" element={<Navigate to="/app/overview" replace />} />
                <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
                <Route path="/agents/*" element={<Navigate to="/app/agents" replace />} />
                <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
                <Route path="/settings/*" element={<Navigate to="/app/settings" replace />} />
                <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
                <Route path="/analytics/*" element={<Navigate to="/app/analytics" replace />} />
                <Route path="/integrations-dashboard" element={<Navigate to="/app/integrations" replace />} />
                <Route path="/integrations/*" element={<Navigate to="/app/integrations" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </div>
  );
}

export default App;
