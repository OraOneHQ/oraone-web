import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import OraOneLoader from "@/components/ui/OraOneLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";
import AnalyticsRouteTracker from "@/components/AnalyticsRouteTracker";

// Layouts (kept eager — small and shared)
import MarketingLayout from "@/layouts/MarketingLayout";
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

// Design-direction demos (review only) — standalone full-page, self-themed
const Demo1 = lazy(() => import("@/pages/demos/Demo1"));
const Demo2 = lazy(() => import("@/pages/demos/Demo2"));
const Demo3 = lazy(() => import("@/pages/demos/Demo3"));
const Demo4 = lazy(() => import("@/pages/demos/Demo4"));
const Demo5 = lazy(() => import("@/pages/demos/Demo5"));
const Demo6 = lazy(() => import("@/pages/demos/Demo6"));
const Demo7 = lazy(() => import("@/pages/demos/Demo7"));
const Demo8 = lazy(() => import("@/pages/demos/Demo8"));

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
const Welcome = lazy(() => import("@/pages/auth/Welcome"));

// Onboarding — lazy
const Step1Agent = lazy(() => import("@/pages/onboarding/Step1Agent"));
const Step2Business = lazy(() => import("@/pages/onboarding/Step2Business"));
const Step3Channels = lazy(() => import("@/pages/onboarding/Step3Channels"));

// Dashboard — lazy (large, only authenticated users see this)
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const Agents = lazy(() => import("@/pages/dashboard/Agents"));
const AgentCreate = lazy(() => import("@/pages/dashboard/AgentCreate"));
const CreateAgentWizard = lazy(() => import("@/pages/dashboard/CreateAgentWizard"));
const AgentBuilder = lazy(() => import("@/pages/dashboard/AgentBuilder"));
const Chat = lazy(() => import("@/pages/dashboard/Chat"));
const Conversations = lazy(() => import("@/pages/dashboard/Conversations"));
const Leads = lazy(() => import("@/pages/dashboard/Leads"));
const Analytics = lazy(() => import("@/pages/dashboard/Analytics"));
const KnowledgeBase = lazy(() => import("@/pages/dashboard/KnowledgeBase"));
const KnowledgeBaseDetails = lazy(() => import("@/pages/dashboard/KnowledgeBaseDetails"));
const Websites = lazy(() => import("@/pages/dashboard/Websites"));
const KnowledgeSearch = lazy(() => import("@/pages/dashboard/KnowledgeSearch"));
const IntegrationsDash = lazy(() => import("@/pages/dashboard/Integrations"));
const Widgets = lazy(() => import("@/pages/dashboard/Widgets"));
const Workflows = lazy(() => import("@/pages/dashboard/Workflows"));
const Team = lazy(() => import("@/pages/dashboard/Team"));
const InviteAccept = lazy(() => import("@/pages/dashboard/InviteAccept"));
const Billing = lazy(() => import("@/pages/dashboard/Billing"));
const Usage = lazy(() => import("@/pages/dashboard/Usage"));
const ApiKeys = lazy(() => import("@/pages/dashboard/ApiKeys"));
const Webhooks = lazy(() => import("@/pages/dashboard/Webhooks"));
const Developers = lazy(() => import("@/pages/dashboard/Developers"));
const AIModels = lazy(() => import("@/pages/dashboard/AIModels"));
const Branding = lazy(() => import("@/pages/dashboard/Branding"));
const AuditLogs = lazy(() => import("@/pages/dashboard/AuditLogs"));
const Settings = lazy(() => import("@/pages/dashboard/Settings"));
// R9 — Enterprise Team Collaboration
const Workspace = lazy(() => import("@/pages/dashboard/Workspace"));
const Projects = lazy(() => import("@/pages/dashboard/Projects"));
const Teams = lazy(() => import("@/pages/dashboard/Teams"));
const Tasks = lazy(() => import("@/pages/dashboard/Tasks"));
const ActivityCenter = lazy(() => import("@/pages/dashboard/ActivityCenter"));
// R10 — Enterprise Security & Operations
const Operations = lazy(() => import("@/pages/dashboard/Operations"));
// Launch — product resources
const Changelog = lazy(() => import("@/pages/dashboard/Changelog"));
const Status = lazy(() => import("@/pages/dashboard/Status"));
const FeatureRequests = lazy(() => import("@/pages/dashboard/FeatureRequests"));
const GettingStarted = lazy(() => import("@/pages/dashboard/GettingStarted"));
const Portal = lazy(() => import("@/pages/dashboard/Portal"));

// Public, unauthenticated shared conversation transcript (R1)
const SharedConversation = lazy(() => import("@/pages/public/SharedConversation"));

function RouteFallback() {
  return <OraOneLoader />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ErrorBoundary>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <AnalyticsRouteTracker />
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

              {/* Design-direction demos (review only) — standalone, no layout */}
              <Route path="/demo1" element={<Demo1 />} />
              <Route path="/demo2" element={<Demo2 />} />
              <Route path="/demo3" element={<Demo3 />} />
              <Route path="/demo4" element={<Demo4 />} />
              <Route path="/demo5" element={<Demo5 />} />
              <Route path="/demo6" element={<Demo6 />} />
              <Route path="/demo7" element={<Demo7 />} />
              <Route path="/demo8" element={<Demo8 />} />

              {/* Cognito Hosted UI callback — no layout wrapper, handles its own full-page UI */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Public shared conversation transcript (R1) — no auth, no layout */}
              <Route path="/share/:token" element={<SharedConversation />} />

              {/* Auth — standalone split-screen pages (each renders its own shell) */}
              {/* Guest-only: signed-in users are bounced to the dashboard. */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verification" element={<VerifyEmail />} />
              <Route path="/verification/*" element={<Navigate to="/verify-email" replace />} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
              <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
              <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />

              {/* Onboarding (requires a signed-in account) */}
              <Route element={<ProtectedRoute><OnboardingLayout /></ProtectedRoute>}>
                <Route path="/onboarding" element={<Navigate to="/onboarding/agent" replace />} />
                <Route path="/onboarding/agent" element={<Step1Agent />} />
                <Route path="/onboarding/business" element={<Step2Business />} />
                <Route path="/onboarding/channels" element={<Step3Channels />} />
              </Route>

              {/* Dashboard (protected) */}
              <Route element={<DashboardLayout />}>
                <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/dashboard" element={<Overview />} />
                <Route path="/app/overview" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/create-agent" element={<CreateAgentWizard />} />
                <Route path="/app/agents" element={<Agents />} />
                <Route path="/app/agents/new" element={<AgentCreate />} />
                <Route path="/app/agents/:id" element={<AgentBuilder />} />
                <Route path="/app/chat" element={<Chat />} />
                <Route path="/app/chat/:conversationId" element={<Chat />} />
                <Route path="/app/conversations" element={<Conversations />} />
                <Route path="/app/leads" element={<Leads />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/app/knowledge-base/:id" element={<KnowledgeBaseDetails />} />
                <Route path="/app/websites" element={<Websites />} />
                <Route path="/app/knowledge-search" element={<KnowledgeSearch />} />
                <Route path="/app/integrations" element={<IntegrationsDash />} />
                <Route path="/app/widgets" element={<Widgets />} />
                <Route path="/app/workflows" element={<Workflows />} />
                <Route path="/app/team" element={<Team />} />
                <Route path="/app/invite/:token" element={<InviteAccept />} />
                <Route path="/app/billing" element={<Billing />} />
                <Route path="/app/usage" element={<Usage />} />
                <Route path="/app/api-keys" element={<ApiKeys />} />
                <Route path="/app/webhooks" element={<Webhooks />} />
                <Route path="/app/developers" element={<Developers />} />
                <Route path="/app/ai-models" element={<AIModels />} />
                <Route path="/app/branding" element={<Branding />} />
                <Route path="/app/audit-logs" element={<AuditLogs />} />
                <Route path="/app/workspace" element={<Workspace />} />
                <Route path="/app/projects" element={<Projects />} />
                <Route path="/app/teams" element={<Teams />} />
                <Route path="/app/tasks" element={<Tasks />} />
                <Route path="/app/activity" element={<ActivityCenter defaultTab="activity" />} />
                <Route path="/app/notifications" element={<ActivityCenter defaultTab="notifications" />} />
                <Route path="/app/operations" element={<Operations />} />
                <Route path="/app/getting-started" element={<GettingStarted />} />
                <Route path="/app/portal" element={<Portal />} />
                <Route path="/app/changelog" element={<Changelog />} />
                <Route path="/app/status" element={<Status />} />
                <Route path="/app/feature-requests" element={<FeatureRequests />} />
                <Route path="/app/settings" element={<Settings />} />
                {/* protected aliases */}
                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/dashboard/*" element={<Navigate to="/app/dashboard" replace />} />
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
