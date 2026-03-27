import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OwnerGovernorProvider } from '@/lib/OwnerGovernorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Landing from './pages/Landing';
import ProjectManager from './pages/ProjectManager';
import SkillsHub from './pages/SkillsHub';
import VillageCalendar from './pages/VillageCalendar';
import AxiCommandDashboard from './pages/AxiCommandDashboard';
import AgentAdditionDiagnostic from './pages/AgentAdditionDiagnostic';
import MemoryBrowser from './pages/MemoryBrowser';
import ImageStorage from './pages/ImageStorage';
import NewProposalDraft from './pages/NewProposalDraft';
import TreasuryAllocationProposal from './pages/TreasuryAllocationProposal';
import TreasurySigningHelper from './pages/TreasurySigningHelper';
import GovernanceVotingDashboard from './pages/GovernanceVotingDashboard';
import ContactSupport from './pages/ContactSupport';
import Dashboard from './pages/Dashboard';
import IntegrationCreditDashboard from './pages/IntegrationCreditDashboard';
import ServiceSkillMarketplace from './pages/ServiceSkillMarketplace';
import GovernanceHub from './pages/GovernanceHub';
import ProjectSanctuary from './pages/ProjectSanctuary';
import SovereignID from './pages/SovereignID';
import KineticGridDashboard from './pages/KineticGridDashboard';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasToken = urlParams.has('token') || urlParams.has('base44_token');
      const isEditorPreview = urlParams.has('_preview_token');
      if (window.location.pathname !== '/' && !hasToken && !isEditorPreview) {
        navigateToLogin();
        return null;
      }
    }
  }

  // In editor preview, redirect / to /Home so the dashboard is shown
  const urlParams = new URLSearchParams(window.location.search);
  const isEditorPreview = urlParams.has('_preview_token');

  // Render the main app
  return (
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
      <Route path="/ImageStorage" element={<LayoutWrapper currentPageName="ImageStorage"><ImageStorage /></LayoutWrapper>} />
      <Route path="/NewProposalDraft" element={<LayoutWrapper currentPageName="NewProposalDraft"><NewProposalDraft /></LayoutWrapper>} />
      <Route path="/governance/new-proposal" element={<LayoutWrapper currentPageName="NewProposalDraft"><NewProposalDraft /></LayoutWrapper>} />
      <Route path="/TreasuryAllocationProposal" element={<LayoutWrapper currentPageName="TreasuryAllocationProposal"><TreasuryAllocationProposal /></LayoutWrapper>} />
      <Route path="/TreasurySigningHelper" element={<LayoutWrapper currentPageName="TreasurySigningHelper"><TreasurySigningHelper /></LayoutWrapper>} />
      <Route path="/GovernanceVotingDashboard" element={<LayoutWrapper currentPageName="GovernanceVotingDashboard"><GovernanceVotingDashboard /></LayoutWrapper>} />
      <Route path="/ContactSupport" element={<ContactSupport />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/IntegrationCreditDashboard" element={<LayoutWrapper currentPageName="IntegrationCreditDashboard"><IntegrationCreditDashboard /></LayoutWrapper>} />
      <Route path="/ServiceSkillMarketplace" element={<LayoutWrapper currentPageName="ServiceSkillMarketplace"><ServiceSkillMarketplace /></LayoutWrapper>} />
      <Route path="/governance" element={<LayoutWrapper currentPageName="GovernanceHub"><GovernanceHub /></LayoutWrapper>} />
      <Route path="/AIProjectManager" element={<LayoutWrapper currentPageName="AIProjectManager"><ProjectManager /></LayoutWrapper>} />
      <Route path="/SkillsHub" element={<LayoutWrapper currentPageName="SkillsHub"><SkillsHub /></LayoutWrapper>} />
      <Route path="/ProjectSanctuary" element={<LayoutWrapper currentPageName="ProjectSanctuary"><ProjectSanctuary /></LayoutWrapper>} />
      <Route path="/SovereignID" element={<LayoutWrapper currentPageName="SovereignID"><SovereignID /></LayoutWrapper>} />
      <Route path="/KineticGridDashboard" element={<LayoutWrapper currentPageName="KineticGridDashboard"><KineticGridDashboard /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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