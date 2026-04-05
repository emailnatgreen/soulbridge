import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OwnerGovernorProvider } from '@/lib/OwnerGovernorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Lazy-load all explicitly-routed pages to keep the initial bundle small
const Landing = lazy(() => import('./pages/Landing'));
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const SkillsHub = lazy(() => import('./pages/SkillsHub'));
const VillageCalendar = lazy(() => import('./pages/VillageCalendar'));
const AxiCommandDashboard = lazy(() => import('./pages/AxiCommandDashboard'));
const AgentAdditionDiagnostic = lazy(() => import('./pages/AgentAdditionDiagnostic'));
const MemoryBrowser = lazy(() => import('./pages/MemoryBrowser'));
const ImageStorage = lazy(() => import('./pages/ImageStorage'));
const NewProposalDraft = lazy(() => import('./pages/NewProposalDraft'));
const TreasuryAllocationProposal = lazy(() => import('./pages/TreasuryAllocationProposal'));
const TreasurySigningHelper = lazy(() => import('./pages/TreasurySigningHelper'));
const GovernanceVotingDashboard = lazy(() => import('./pages/GovernanceVotingDashboard'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const IntegrationCreditDashboard = lazy(() => import('./pages/IntegrationCreditDashboard'));
const ServiceSkillMarketplace = lazy(() => import('./pages/ServiceSkillMarketplace'));
const GovernanceHub = lazy(() => import('./pages/GovernanceHub'));
const ProjectSanctuary = lazy(() => import('./pages/ProjectSanctuary'));
const SovereignID = lazy(() => import('./pages/SovereignID'));
const KineticGridDashboard = lazy(() => import('./pages/KineticGridDashboard'));
const ScrollOfResonance = lazy(() => import('./pages/ScrollOfResonance'));
const KineticCompass = lazy(() => import('./pages/KineticCompass'));
const InviteLinkManager = lazy(() => import('./pages/InviteLinkManager'));
const NodeCovenant = lazy(() => import('./pages/NodeCovenant'));
const SyncAuditReport = lazy(() => import('./pages/SyncAuditReport'));
const SkillValidation = lazy(() => import('./pages/SkillValidation'));
const AgentCommsDashboard = lazy(() => import('./pages/AgentCommsDashboard'));
const AIProjectHub = lazy(() => import('./pages/AIProjectHub'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const AdminInquiries = lazy(() => import('./pages/AdminInquiries'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const XRPLMainnetInfo = lazy(() => import('./pages/XRPLMainnetInfo'));
const FSMAInfo = lazy(() => import('./pages/FSMAInfo'));
const XamanInfo = lazy(() => import('./pages/XamanInfo'));
const VipInviteDashboard = lazy(() => import('./pages/VipInviteDashboard'));

const { Pages, Layout, mainPage } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Suspense fallback={<LoadingFallback />}>
    <Layout currentPageName={currentPageName}>{children}</Layout>
  </Suspense>
  : <>{children}</>;

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
    <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return <LoadingFallback />;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/VillageCalendar" element={<LayoutWrapper currentPageName="VillageCalendar"><VillageCalendar /></LayoutWrapper>} />
        <Route path="/AxiCommandDashboard" element={<LayoutWrapper currentPageName="AxiCommandDashboard"><AxiCommandDashboard /></LayoutWrapper>} />
        <Route path="/AgentAdditionDiagnostic" element={<LayoutWrapper currentPageName="AgentAdditionDiagnostic"><AgentAdditionDiagnostic /></LayoutWrapper>} />
        <Route path="/MemoryBrowser" element={<LayoutWrapper currentPageName="MemoryBrowser"><MemoryBrowser /></LayoutWrapper>} />
        <Route path="/NewProposalDraft" element={<LayoutWrapper currentPageName="NewProposalDraft"><NewProposalDraft /></LayoutWrapper>} />
        <Route path="/governance/new-proposal" element={<LayoutWrapper currentPageName="NewProposalDraft"><NewProposalDraft /></LayoutWrapper>} />
        <Route path="/TreasuryAllocationProposal" element={<LayoutWrapper currentPageName="TreasuryAllocationProposal"><TreasuryAllocationProposal /></LayoutWrapper>} />
        <Route path="/TreasurySigningHelper" element={<LayoutWrapper currentPageName="TreasurySigningHelper"><TreasurySigningHelper /></LayoutWrapper>} />
        <Route path="/GovernanceVotingDashboard" element={<LayoutWrapper currentPageName="GovernanceVotingDashboard"><GovernanceVotingDashboard /></LayoutWrapper>} />
        <Route path="/ContactSupport" element={<ContactSupport />} />
        <Route path="/dashboard" element={<LayoutWrapper currentPageName="dashboard"><Dashboard /></LayoutWrapper>} />
        <Route path="/IntegrationCreditDashboard" element={<LayoutWrapper currentPageName="IntegrationCreditDashboard"><IntegrationCreditDashboard /></LayoutWrapper>} />
        <Route path="/ServiceSkillMarketplace" element={<LayoutWrapper currentPageName="ServiceSkillMarketplace"><ServiceSkillMarketplace /></LayoutWrapper>} />
        <Route path="/governance" element={<LayoutWrapper currentPageName="GovernanceHub"><GovernanceHub /></LayoutWrapper>} />
        <Route path="/AIProjectManager" element={<LayoutWrapper currentPageName="AIProjectManager"><ProjectManager /></LayoutWrapper>} />
        <Route path="/SkillsHub" element={<LayoutWrapper currentPageName="SkillsHub"><SkillsHub /></LayoutWrapper>} />
        <Route path="/ProjectSanctuary" element={<LayoutWrapper currentPageName="ProjectSanctuary"><ProjectSanctuary /></LayoutWrapper>} />
        <Route path="/SovereignID" element={<LayoutWrapper currentPageName="SovereignID"><SovereignID /></LayoutWrapper>} />
        <Route path="/KineticGridDashboard" element={<LayoutWrapper currentPageName="KineticGridDashboard"><KineticGridDashboard /></LayoutWrapper>} />
        <Route path="/ScrollOfResonance" element={<ScrollOfResonance />} />
        <Route path="/KineticCompass" element={<KineticCompass />} />
        <Route path="/InviteLinkManager" element={<LayoutWrapper currentPageName="InviteLinkManager"><InviteLinkManager /></LayoutWrapper>} />
        <Route path="/NodeCovenant" element={<LayoutWrapper currentPageName="NodeCovenant"><NodeCovenant /></LayoutWrapper>} />
        <Route path="/SyncAuditReport" element={<LayoutWrapper currentPageName="SyncAuditReport"><SyncAuditReport /></LayoutWrapper>} />
        <Route path="/SkillValidation" element={<LayoutWrapper currentPageName="SkillValidation"><SkillValidation /></LayoutWrapper>} />
        <Route path="/AgentCommsDashboard" element={<LayoutWrapper currentPageName="AgentCommsDashboard"><AgentCommsDashboard /></LayoutWrapper>} />
        <Route path="/AIProjectHub" element={<LayoutWrapper currentPageName="AIProjectHub"><AIProjectHub /></LayoutWrapper>} />
        <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
        <Route path="/CookiePolicy" element={<CookiePolicy />} />
        <Route path="/AdminInquiries" element={<LayoutWrapper currentPageName="AdminInquiries"><AdminInquiries /></LayoutWrapper>} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/xrpl-info" element={<XRPLMainnetInfo />} />
        <Route path="/fsma-info" element={<FSMAInfo />} />
        <Route path="/xaman-info" element={<XamanInfo />} />
        <Route path="/VipInviteDashboard" element={<LayoutWrapper currentPageName="VipInviteDashboard"><VipInviteDashboard /></LayoutWrapper>} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <OwnerGovernorProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </OwnerGovernorProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;