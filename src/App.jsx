import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OwnerGovernorProvider } from '@/lib/OwnerGovernorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './Layout';

// PUBLIC PAGES
import LandingPage from './pages/LandingPage.jsx';
const ContactSupport = lazy(() => import('./pages/ContactSupport'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const XRPLMainnetInfo = lazy(() => import('./pages/XRPLMainnetInfo'));
const FSMAInfo = lazy(() => import('./pages/FSMAInfo'));
const XamanInfo = lazy(() => import('./pages/XamanInfo'));
const KineticCompass = lazy(() => import('./pages/KineticCompass'));
const Terms = lazy(() => import('./pages/Terms'));
const Support = lazy(() => import('./pages/Support'));

// CORE USER HUBS
const Home = lazy(() => import('./pages/Home'));
const Agents = lazy(() => import('./pages/Agents'));
const AgentProfile = lazy(() => import('./pages/AgentProfile'));
const GovernanceHub = lazy(() => import('./pages/GovernanceHub'));
const Wallets = lazy(() => import('./pages/Wallets'));
const MemoryBrowser = lazy(() => import('./pages/MemoryBrowser'));
const VillageCalendar = lazy(() => import('./pages/VillageCalendar'));
const SkillsHub = lazy(() => import('./pages/SkillsHub'));
const ServiceSkillMarketplace = lazy(() => import('./pages/ServiceSkillMarketplace'));
const AgentLeaderboard = lazy(() => import('./pages/AgentLeaderboard'));
const AgentOnboarding = lazy(() => import('./pages/AgentOnboarding'));
const SovereignID = lazy(() => import('./pages/SovereignID'));
const SkillValidation = lazy(() => import('./pages/SkillValidation'));
const AgentMarketplace = lazy(() => import('./pages/AgentMarketplace'));
const AgentChat = lazy(() => import('./pages/AgentChat'));
const SkillDevelopment = lazy(() => import('./pages/SkillDevelopment'));
const AgentProfile_EditProfile = lazy(() => import('./pages/EditAgentProfile'));

// ADMIN PAGES (restricted)
const AxiCommandDashboard = lazy(() => import('./pages/AxiCommandDashboard'));
const Axi = lazy(() => import('./pages/Axi'));
const AxiIntelligenceFeed = lazy(() => import('./pages/AxiIntelligenceFeed'));
const AgentOrchestration = lazy(() => import('./pages/AgentOrchestration'));
const AgentPerformanceAnalytics = lazy(() => import('./pages/AgentPerformanceAnalytics'));
const AgentRolePermissions = lazy(() => import('./pages/AgentRolePermissions'));
const AgentWellbeing = lazy(() => import('./pages/AgentWellbeing'));
const AgentAdditionDiagnostic = lazy(() => import('./pages/AgentAdditionDiagnostic'));
const IntegrationCreditDashboard = lazy(() => import('./pages/IntegrationCreditDashboard'));
const AdminInquiries = lazy(() => import('./pages/AdminInquiries'));
const TreasurySigningHelper = lazy(() => import('./pages/TreasurySigningHelper'));
const VipInviteDashboard = lazy(() => import('./pages/VipInviteDashboard'));
const GovernanceVotingDashboard = lazy(() => import('./pages/GovernanceVotingDashboard'));
const NewProposalDraft = lazy(() => import('./pages/NewProposalDraft'));
const TreasuryAllocationProposal = lazy(() => import('./pages/TreasuryAllocationProposal'));
const AgentTrainingModule = lazy(() => import('./pages/AgentTrainingModule'));
const KineticGridDashboard = lazy(() => import('./pages/KineticGridDashboard'));

// LEGACY (kept for backward compat, minimal use)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const AIProjectHub = lazy(() => import('./pages/AIProjectHub'));
const EditLanding = lazy(() => import('./pages/EditLanding'));


const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
    <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
  </div>
);

const LayoutWrap = ({ children, pageName }) => (
  <Suspense fallback={<LoadingFallback />}>
    <Layout currentPageName={pageName}>{children}</Layout>
  </Suspense>
);

const L = (pageName, Component) => (
  <LayoutWrap pageName={pageName}><Component /></LayoutWrap>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingFallback />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* PUBLIC PAGES (no layout) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/xrpl-info" element={<XRPLMainnetInfo />} />
        <Route path="/fsma-info" element={<FSMAInfo />} />
        <Route path="/xaman-info" element={<XamanInfo />} />
        <Route path="/kinetic-compass" element={<KineticCompass />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/support" element={<Support />} />
        {/* Backward compat */}
        <Route path="/ContactSupport" element={<ContactSupport />} />
        <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
        <Route path="/CookiePolicy" element={<CookiePolicy />} />
        <Route path="/Terms" element={<Terms />} />
        <Route path="/Support" element={<Support />} />
        <Route path="/KineticCompass" element={<KineticCompass />} />
        <Route path="/EditLanding" element={<EditLanding />} />

        {/* CORE USER HUBS */}
        <Route path="/home" element={L("home", Home)} />
        <Route path="/Home" element={L("home", Home)} />
        <Route path="/agents" element={L("agents", Agents)} />
        <Route path="/Agents" element={L("agents", Agents)} />
        <Route path="/agents/:id" element={L("agent-profile", AgentProfile)} />
        <Route path="/AgentProfile" element={L("agent-profile", AgentProfile)} />
        <Route path="/governance" element={L("governance", GovernanceHub)} />
        <Route path="/wallets" element={L("wallets", Wallets)} />
        <Route path="/Wallets" element={L("wallets", Wallets)} />
        <Route path="/memory-browser" element={L("memory", MemoryBrowser)} />
        <Route path="/MemoryBrowser" element={L("memory", MemoryBrowser)} />
        <Route path="/calendar" element={L("calendar", VillageCalendar)} />
        <Route path="/VillageCalendar" element={L("calendar", VillageCalendar)} />
        <Route path="/skills" element={L("skills", SkillsHub)} />
        <Route path="/SkillsHub" element={L("skills", SkillsHub)} />
        <Route path="/marketplace" element={L("marketplace", ServiceSkillMarketplace)} />
        <Route path="/ServiceSkillMarketplace" element={L("marketplace", ServiceSkillMarketplace)} />
        <Route path="/leaderboard" element={L("leaderboard", AgentLeaderboard)} />
        <Route path="/AgentLeaderboard" element={L("leaderboard", AgentLeaderboard)} />
        <Route path="/onboarding" element={L("onboarding", AgentOnboarding)} />
        <Route path="/AgentOnboarding" element={L("onboarding", AgentOnboarding)} />
        <Route path="/sovereign-id" element={L("sovereign-id", SovereignID)} />
        <Route path="/SovereignID" element={L("sovereign-id", SovereignID)} />
        <Route path="/training" element={L("training", SkillDevelopment)} />
        <Route path="/SkillDevelopment" element={L("training", SkillDevelopment)} />
        <Route path="/agents/edit" element={L("edit-profile", AgentProfile_EditProfile)} />
        <Route path="/EditAgentProfile" element={L("edit-profile", AgentProfile_EditProfile)} />

        {/* ADMIN/RESTRICTED PAGES */}
        <Route path="/admin/axi-command" element={L("axi-command", AxiCommandDashboard)} />
        <Route path="/AxiCommandDashboard" element={L("axi-command", AxiCommandDashboard)} />
        <Route path="/admin/axi" element={L("axi", Axi)} />
        <Route path="/Axi" element={L("axi", Axi)} />
        <Route path="/admin/axi-feed" element={L("axi-feed", AxiIntelligenceFeed)} />
        <Route path="/AxiIntelligenceFeed" element={L("axi-feed", AxiIntelligenceFeed)} />
        <Route path="/admin/orchestration" element={L("orchestration", AgentOrchestration)} />
        <Route path="/AgentOrchestration" element={L("orchestration", AgentOrchestration)} />
        <Route path="/admin/performance" element={L("performance", AgentPerformanceAnalytics)} />
        <Route path="/AgentPerformanceAnalytics" element={L("performance", AgentPerformanceAnalytics)} />
        <Route path="/admin/roles" element={L("roles", AgentRolePermissions)} />
        <Route path="/AgentRolePermissions" element={L("roles", AgentRolePermissions)} />
        <Route path="/admin/wellbeing" element={L("wellbeing", AgentWellbeing)} />
        <Route path="/AgentWellbeing" element={L("wellbeing", AgentWellbeing)} />
        <Route path="/admin/diagnostics" element={L("diagnostics", AgentAdditionDiagnostic)} />
        <Route path="/AgentAdditionDiagnostic" element={L("diagnostics", AgentAdditionDiagnostic)} />
        <Route path="/admin/credits" element={L("credits", IntegrationCreditDashboard)} />
        <Route path="/IntegrationCreditDashboard" element={L("credits", IntegrationCreditDashboard)} />
        <Route path="/admin/inquiries" element={L("inquiries", AdminInquiries)} />
        <Route path="/AdminInquiries" element={L("inquiries", AdminInquiries)} />
        <Route path="/admin/treasury" element={L("treasury", TreasurySigningHelper)} />
        <Route path="/TreasurySigningHelper" element={L("treasury", TreasurySigningHelper)} />
        <Route path="/admin/vip-invites" element={L("vip-invites", VipInviteDashboard)} />
        <Route path="/VipInviteDashboard" element={L("vip-invites", VipInviteDashboard)} />
        <Route path="/GovernanceVotingDashboard" element={L("governance-voting", GovernanceVotingDashboard)} />
        <Route path="/NewProposalDraft" element={L("new-proposal", NewProposalDraft)} />
        <Route path="/governance/new-proposal" element={L("new-proposal", NewProposalDraft)} />
        <Route path="/TreasuryAllocationProposal" element={L("treasury-proposal", TreasuryAllocationProposal)} />
        <Route path="/AgentTrainingModule" element={L("training-module", AgentTrainingModule)} />
        <Route path="/KineticGridDashboard" element={L("kinetic-grid", KineticGridDashboard)} />

        {/* LEGACY/BACKWARD COMPAT - still accessible but not in primary nav */}
        <Route path="/dashboard" element={L("dashboard", Dashboard)} />
        <Route path="/AIProjectManager" element={L("projects", ProjectManager)} />
        <Route path="/AIProjectHub" element={L("project-hub", AIProjectHub)} />
        <Route path="/AgentChat" element={L("chat", AgentChat)} />
        <Route path="/SkillValidation" element={L("skill-validation", SkillValidation)} />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <OwnerGovernorProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </OwnerGovernorProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;