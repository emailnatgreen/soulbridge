import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OwnerGovernorProvider } from '@/lib/OwnerGovernorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './Layout';

// PUBLIC PAGES
import LandingPage from './pages/LandingPage.jsx';
import ContactSupport from './pages/ContactSupport';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import AboutUs from './pages/AboutUs';
import XRPLMainnetInfo from './pages/XRPLMainnetInfo';
import FSMAInfo from './pages/FSMAInfo';
import XamanInfo from './pages/XamanInfo';
import KineticCompass from './pages/KineticCompass';
import Terms from './pages/Terms';
import Support from './pages/Support';

// CORE USER HUBS
import Home from './pages/Home';
import Agents from './pages/Agents';
import AgentProfile from './pages/AgentProfile';
import GovernanceHub from './pages/GovernanceHub';
import Wallets from './pages/Wallets';
import MemoryBrowser from './pages/MemoryBrowser';
import VillageCalendar from './pages/VillageCalendar';
import SkillsHub from './pages/SkillsHub';
import ServiceSkillMarketplace from './pages/ServiceSkillMarketplace';
import AgentLeaderboard from './pages/AgentLeaderboard';
import AgentGenesis from './pages/AgentGenesis';
import SovereignID from './pages/SovereignID';
import SkillValidation from './pages/SkillValidation';
import AgentMarketplace from './pages/AgentMarketplace';
import DIDManager from './pages/DIDManager';
import AgentChat from './pages/AgentChat';
import SkillDevelopment from './pages/SkillDevelopment';
import AgentProfile_EditProfile from './pages/EditAgentProfile';

// ADMIN PAGES
import AxiCommandDashboard from './pages/AxiCommandDashboard';
import Axi from './pages/Axi';
import AxiIntelligenceFeed from './pages/AxiIntelligenceFeed';
import AgentOrchestration from './pages/AgentOrchestration';
import AgentPerformanceAnalytics from './pages/AgentPerformanceAnalytics';
import AgentRolePermissions from './pages/AgentRolePermissions';
import AgentWellbeing from './pages/AgentWellbeing';
import AgentAdditionDiagnostic from './pages/AgentAdditionDiagnostic';
import IntegrationCreditDashboard from './pages/IntegrationCreditDashboard';
import AdminInquiries from './pages/AdminInquiries';
import TreasurySigningHelper from './pages/TreasurySigningHelper';
import VipInviteDashboard from './pages/VipInviteDashboard';
import GovernanceVotingDashboard from './pages/GovernanceVotingDashboard';
import NewProposalDraft from './pages/NewProposalDraft';
import TreasuryAllocationProposal from './pages/TreasuryAllocationProposal';
import AgentTrainingModule from './pages/AgentTrainingModule';
import AgentSkillTree from './pages/AgentSkillTree';
import KineticGridDashboard from './pages/KineticGridDashboard';
import KineticWasteDashboard from './pages/KineticWasteDashboard';
import EconomicDashboard from './pages/EconomicDashboard';

// LEGACY
import Dashboard from './pages/Dashboard';
import ProjectManager from './pages/ProjectManager';
import AIProjectHub from './pages/AIProjectHub';
import EditLanding from './pages/EditLanding';
import ScrollOfResonance from './pages/ScrollOfResonance';
import NodeCovenant from './pages/NodeCovenant';
import MentorshipHub from './pages/MentorshipHub';


const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
    <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
  </div>
);



function LayoutWrap({ children, pageName }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Layout currentPageName={pageName}>{children}</Layout>
    </Suspense>
  );
}

function L(pageName, Component) {
  return <LayoutWrap pageName={pageName}><Component /></LayoutWrap>;
}

// Public paths that should NEVER require authentication
const PUBLIC_PATHS = [
  '/', '/contact-support', '/ContactSupport',
  '/privacy-policy', '/PrivacyPolicy',
  '/cookie-policy', '/CookiePolicy',
  '/about', '/xrpl-info', '/fsma-info', '/xaman-info',
  '/kinetic-compass', '/KineticCompass',
  '/terms', '/Terms', '/support', '/Support',
  '/EditLanding',
  '/ScrollOfResonance',
  '/scroll-of-resonance',
];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname) || PUBLIC_PATHS.includes(location.pathname.replace(/\/$/, ''));

  if (isLoadingPublicSettings || isLoadingAuth) {
    // Let public pages render while auth is loading
    if (isPublicPath) {
      return (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact-support" element={<ContactSupport />} />
          <Route path="/ContactSupport" element={<ContactSupport />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/CookiePolicy" element={<CookiePolicy />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/xrpl-info" element={<XRPLMainnetInfo />} />
          <Route path="/fsma-info" element={<FSMAInfo />} />
          <Route path="/xaman-info" element={<XamanInfo />} />
          <Route path="/kinetic-compass" element={<KineticCompass />} />
          <Route path="/KineticCompass" element={<KineticCompass />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/Terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/Support" element={<Support />} />
          <Route path="/EditLanding" element={<EditLanding />} />
          <Route path="/ScrollOfResonance" element={<ScrollOfResonance />} />
          <Route path="/scroll-of-resonance" element={<ScrollOfResonance />} />
          <Route path="*" element={<LoadingFallback />} />
        </Routes>
      );
    }
    return <LoadingFallback />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      // Still allow public pages even for unregistered users
      if (isPublicPath) {
        // fall through to render all routes
      } else {
        return <UserNotRegisteredError />;
      }
    } else if (authError.type === 'auth_required') {
      // Only redirect to login for non-public pages
      if (!isPublicPath) {
        navigateToLogin();
        return null;
      }
      // Public pages: fall through to render
    }
  }

  return (
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
        <Route path="/ScrollOfResonance" element={<ScrollOfResonance />} />
        <Route path="/scroll-of-resonance" element={<ScrollOfResonance />} />

        {/* CORE USER HUBS */}
        <Route path="/home" element={L("home", Home)} />
        <Route path="/Home" element={L("home", Home)} />
        <Route path="/agents" element={L("agents", Agents)} />
        <Route path="/Agents" element={L("agents", Agents)} />
        <Route path="/agents/:id" element={L("agent-profile", AgentProfile)} />
        <Route path="/AgentProfile" element={L("agent-profile", AgentProfile)} />
        <Route path="/governance" element={L("governance", GovernanceHub)} />
        <Route path="/GovernanceHub" element={L("governance", GovernanceHub)} />
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
        <Route path="/agent-genesis" element={L("agent-genesis", AgentGenesis)} />
        <Route path="/AgentGenesis" element={L("agent-genesis", AgentGenesis)} />
        <Route path="/sovereign-id" element={L("sovereign-id", SovereignID)} />
        <Route path="/SovereignID" element={L("sovereign-id", SovereignID)} />
        <Route path="/did-manager" element={L("did-manager", DIDManager)} />
        <Route path="/DIDManager" element={L("did-manager", DIDManager)} />
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
        <Route path="/KineticWasteDashboard" element={L("kinetic-waste", KineticWasteDashboard)} />
        <Route path="/Economy" element={L("economy", EconomicDashboard)} />
        <Route path="/EconomicDashboard" element={L("economy", EconomicDashboard)} />
        <Route path="/NodeCovenant" element={L("NodeCovenant", NodeCovenant)} />
        <Route path="/node-covenant" element={L("NodeCovenant", NodeCovenant)} />
        <Route path="/MentorshipHub" element={L("MentorshipHub", MentorshipHub)} />
        <Route path="/mentorship" element={L("MentorshipHub", MentorshipHub)} />

        {/* LEGACY/BACKWARD COMPAT */}
        <Route path="/dashboard" element={L("dashboard", Dashboard)} />
        <Route path="/AIProjectManager" element={L("projects", ProjectManager)} />
        <Route path="/AIProjectHub" element={L("project-hub", AIProjectHub)} />
        <Route path="/AgentChat" element={L("chat", AgentChat)} />
        <Route path="/SkillValidation" element={L("skill-validation", SkillValidation)} />
        <Route path="/AgentSkillTree" element={L("skill-tree", AgentSkillTree)} />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
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