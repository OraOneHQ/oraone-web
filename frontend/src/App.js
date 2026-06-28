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

// Product 2 — Voice AI platform (own layout + pages)
const VoiceLayout = lazy(() => import("@/layouts/VoiceLayout"));
const VoiceDashboard = lazy(() => import("@/pages/voice/VoiceDashboard"));
const VoiceAgents = lazy(() => import("@/pages/voice/VoiceAgents"));
const PhoneNumbers = lazy(() => import("@/pages/voice/PhoneNumbers"));
const VoiceKnowledge = lazy(() => import("@/pages/voice/VoiceKnowledge"));
const CallHistory = lazy(() => import("@/pages/voice/CallHistory"));
const CallDetails = lazy(() => import("@/pages/voice/CallDetails"));
const VoiceAnalytics = lazy(() => import("@/pages/voice/VoiceAnalytics"));
const VoiceWorkflows = lazy(() => import("@/pages/voice/VoiceWorkflows"));
const Campaigns = lazy(() => import("@/pages/voice/Campaigns"));
const SalesAssistant = lazy(() => import("@/pages/voice/SalesAssistant"));
const HandoffQueue = lazy(() => import("@/pages/voice/HandoffQueue"));
const AppointmentEngine = lazy(() => import("@/pages/voice/AppointmentEngine"));
const VoiceStudio = lazy(() => import("@/pages/voice/VoiceStudio"));
const Supervisor = lazy(() => import("@/pages/voice/Supervisor"));
const Compliance = lazy(() => import("@/pages/voice/Compliance"));
const PromptStudio = lazy(() => import("@/pages/voice/PromptStudio"));
const PaymentAssistant = lazy(() => import("@/pages/voice/PaymentAssistant"));
const DocumentAssistant = lazy(() => import("@/pages/voice/DocumentAssistant"));
const VoiceIntegrations = lazy(() => import("@/pages/voice/VoiceIntegrations"));
const TestingLab = lazy(() => import("@/pages/voice/TestingLab"));
const VoiceBilling = lazy(() => import("@/pages/voice/VoiceBilling"));
const VoiceUsage = lazy(() => import("@/pages/voice/VoiceUsage"));
const VoiceSettings = lazy(() => import("@/pages/voice/VoiceSettings"));
const Leads = lazy(() => import("@/pages/dashboard/Leads"));
const Analytics = lazy(() => import("@/pages/dashboard/Analytics"));
const KnowledgeBase = lazy(() => import("@/pages/dashboard/KnowledgeBase"));
const KnowledgeBaseDetails = lazy(() => import("@/pages/dashboard/KnowledgeBaseDetails"));
const Websites = lazy(() => import("@/pages/dashboard/Websites"));
const KnowledgeSearch = lazy(() => import("@/pages/dashboard/KnowledgeSearch"));
const IntegrationsDash = lazy(() => import("@/pages/dashboard/Integrations"));
const Widgets = lazy(() => import("@/pages/dashboard/Widgets"));
const Deploy = lazy(() => import("@/pages/dashboard/Deploy"));
const Marketplace = lazy(() => import("@/pages/dashboard/Marketplace"));
const AssistantsHub = lazy(() => import("@/pages/dashboard/AssistantsHub"));
const OptimizationScore = lazy(() => import("@/pages/dashboard/OptimizationScore"));
const KnowledgeCoverage = lazy(() => import("@/pages/dashboard/KnowledgeCoverage"));
const RevenueAttribution = lazy(() => import("@/pages/dashboard/RevenueAttribution"));
const Customer360 = lazy(() => import("@/pages/dashboard/Customer360"));
const AgentQualityLab = lazy(() => import("@/pages/dashboard/AgentQualityLab"));
const AgentVersions = lazy(() => import("@/pages/dashboard/AgentVersions"));
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

// Super Admin Control Center (founder/platform-admin only, own shell)
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminMonitoring = lazy(() => import("@/pages/admin/Monitoring"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminInsights = lazy(() => import("@/pages/admin/Insights"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminConversations = lazy(() => import("@/pages/admin/Conversations"));
const AdminBilling = lazy(() => import("@/pages/admin/Billing"));
const AdminUsage = lazy(() => import("@/pages/admin/Usage"));
const AdminSecurity = lazy(() => import("@/pages/admin/Security"));
const AdminFeatureFlags = lazy(() => import("@/pages/admin/FeatureFlags"));
const AdminSecrets = lazy(() => import("@/pages/admin/Secrets"));
const AdminReleases = lazy(() => import("@/pages/admin/Releases"));
const AdminInfrastructure = lazy(() => import("@/pages/admin/Infrastructure"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const AdminResourcePage = lazy(() => import("@/pages/admin/ResourcePage"));
const AdminModulePage = lazy(() => import("@/pages/admin/ModulePage"));
const AdminCostOptimization = lazy(() => import("@/pages/admin/CostOptimization"));
const AdminQuality = lazy(() => import("@/pages/admin/Quality"));
const AdminSelfImprovement = lazy(() => import("@/pages/admin/SelfImprovement"));
const AdminBenchmarking = lazy(() => import("@/pages/admin/Benchmarking"));
const AdminHealthMonitor = lazy(() => import("@/pages/admin/HealthMonitor"));
const AdminFraud = lazy(() => import("@/pages/admin/Fraud"));
const AdminCompliance = lazy(() => import("@/pages/admin/Compliance"));
const AdminTenantIsolation = lazy(() => import("@/pages/admin/TenantIsolation"));
const AdminUniversalSearch = lazy(() => import("@/pages/admin/UniversalSearch"));
const AdminOraCopilot = lazy(() => import("@/pages/admin/OraCopilot"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));

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
                <Route path="/app/contacts" element={<Leads />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/app/knowledge-base/:id" element={<KnowledgeBaseDetails />} />
                <Route path="/app/websites" element={<Websites />} />
                <Route path="/app/knowledge-search" element={<KnowledgeSearch />} />
                <Route path="/app/integrations" element={<IntegrationsDash />} />
                <Route path="/app/widgets" element={<Widgets />} />
                <Route path="/app/deploy" element={<Deploy />} />
                <Route path="/app/marketplace" element={<Marketplace />} />
                <Route path="/app/assistants" element={<AssistantsHub />} />
                <Route path="/app/optimization-score" element={<OptimizationScore />} />
                <Route path="/app/knowledge-coverage" element={<KnowledgeCoverage />} />
                <Route path="/app/revenue-attribution" element={<RevenueAttribution />} />
                <Route path="/app/customer-360" element={<Customer360 />} />
                <Route path="/app/quality-lab" element={<AgentQualityLab />} />
                <Route path="/app/agent-versions" element={<AgentVersions />} />
                <Route path="/app/agents/:id/deploy" element={<Deploy />} />
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

              {/* Product 2 — Voice AI platform (protected, own shell) */}
              <Route element={<VoiceLayout />}>
                <Route path="/app/voice" element={<VoiceDashboard />} />
                <Route path="/app/voice/agents" element={<VoiceAgents />} />
                <Route path="/app/voice/numbers" element={<PhoneNumbers />} />
                <Route path="/app/voice/knowledge" element={<VoiceKnowledge />} />
                <Route path="/app/voice/calls" element={<CallHistory />} />
                <Route path="/app/voice/calls/:id" element={<CallDetails />} />
                <Route path="/app/voice/analytics" element={<VoiceAnalytics />} />
                <Route path="/app/voice/workflows" element={<VoiceWorkflows />} />
                <Route path="/app/voice/campaigns" element={<Campaigns />} />
                <Route path="/app/voice/sales" element={<SalesAssistant />} />
                <Route path="/app/voice/handoff" element={<HandoffQueue />} />
                <Route path="/app/voice/appointments" element={<AppointmentEngine />} />
                <Route path="/app/voice/voice-studio" element={<VoiceStudio />} />
                <Route path="/app/voice/supervisor" element={<Supervisor />} />
                <Route path="/app/voice/compliance" element={<Compliance />} />
                <Route path="/app/voice/prompt-studio" element={<PromptStudio />} />
                <Route path="/app/voice/payments" element={<PaymentAssistant />} />
                <Route path="/app/voice/documents" element={<DocumentAssistant />} />
                <Route path="/app/voice/integrations" element={<VoiceIntegrations />} />
                <Route path="/app/voice/testing" element={<TestingLab />} />
                <Route path="/app/voice/billing" element={<VoiceBilling />} />
                <Route path="/app/voice/usage" element={<VoiceUsage />} />
                <Route path="/app/voice/settings" element={<VoiceSettings />} />
              </Route>

              {/* Super Admin Control Center — founder/platform-admin only.
                  AdminLayout wraps ProtectedRoute + access gate internally. */}
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/search" element={<AdminUniversalSearch />} />
                <Route path="/admin/copilot" element={<AdminOraCopilot />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/monitoring" element={<AdminMonitoring />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/insights" element={<AdminInsights />} />

                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/workspaces" element={<AdminResourcePage kind="workspaces" />} />
                <Route path="/admin/conversations" element={<AdminConversations />} />
                <Route path="/admin/leads" element={<AdminResourcePage kind="leads" />} />
                <Route path="/admin/support" element={<AdminModulePage moduleKey="support" />} />

                <Route path="/admin/agents" element={<AdminResourcePage kind="agents" />} />
                <Route path="/admin/knowledge" element={<AdminResourcePage kind="knowledge" />} />
                <Route path="/admin/workflows" element={<AdminResourcePage kind="workflows" />} />
                <Route path="/admin/channels" element={<AdminResourcePage kind="channels" />} />
                <Route path="/admin/phone-numbers" element={<AdminModulePage moduleKey="phone-numbers" />} />

                <Route path="/admin/billing" element={<AdminBilling variant="billing" />} />
                <Route path="/admin/subscriptions" element={<AdminBilling variant="subscriptions" />} />
                <Route path="/admin/usage" element={<AdminUsage />} />

                <Route path="/admin/cost" element={<AdminCostOptimization />} />
                <Route path="/admin/quality" element={<AdminQuality />} />
                <Route path="/admin/self-improvement" element={<AdminSelfImprovement />} />
                <Route path="/admin/benchmarking" element={<AdminBenchmarking />} />
                <Route path="/admin/health" element={<AdminHealthMonitor />} />

                <Route path="/admin/integrations" element={<AdminResourcePage kind="integrations" />} />
                <Route path="/admin/api-keys" element={<AdminResourcePage kind="api_keys" />} />
                <Route path="/admin/infrastructure" element={<AdminInfrastructure />} />
                <Route path="/admin/databases" element={<AdminModulePage moduleKey="databases" />} />
                <Route path="/admin/queues" element={<AdminModulePage moduleKey="queues" />} />

                <Route path="/admin/deployments" element={<AdminReleases variant="deployments" />} />
                <Route path="/admin/releases" element={<AdminReleases variant="releases" />} />
                <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />

                <Route path="/admin/logs" element={<AdminAuditLogs variant="logs" />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs variant="audit" />} />
                <Route path="/admin/alerts" element={<AdminModulePage moduleKey="alerts" />} />

                <Route path="/admin/security" element={<AdminSecurity />} />
                <Route path="/admin/secrets" element={<AdminSecrets />} />
                <Route path="/admin/fraud" element={<AdminFraud />} />
                <Route path="/admin/compliance" element={<AdminCompliance />} />
                <Route path="/admin/tenant-isolation" element={<AdminTenantIsolation />} />
                <Route path="/admin/ai-operations" element={<AdminModulePage moduleKey="ai-operations" />} />

                <Route path="/admin/backups" element={<AdminModulePage moduleKey="backups" />} />
                <Route path="/admin/disaster-recovery" element={<AdminModulePage moduleKey="disaster-recovery" />} />
                <Route path="/admin/settings" element={<AdminModulePage moduleKey="settings" />} />
                <Route path="/admin/developer" element={<AdminModulePage moduleKey="developer" />} />
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
