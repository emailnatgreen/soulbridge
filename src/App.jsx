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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();

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
      // Allow Landing (/) to be public — only redirect on other pages
      if (window.location.pathname !== '/') {
        navigateToLogin();
        return null;
      }
    }
  }

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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <OwnerGovernorProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </OwnerGovernorProvider>
    </AuthProvider>
  )
}

export default App