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
      <Route path="/" element={isEditorPreview || isAuthenticated ? (
        isAuthenticated && user && user.role !== 'admin' ? (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
            <div className="text-4xl">🚫</div>
            <h1 className="text-2xl font-bold">Access Restricted</h1>
            <p className="text-white/50">This platform is for authorised administrators only.</p>
            <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Sign Out</button>
          </div>
        ) : (
          <LayoutWrapper currentPageName="Home"><Pages.Home /></LayoutWrapper>
        )
      ) : <Landing />} />
};


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
  )
}

export default App