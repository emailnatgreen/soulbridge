import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './Layout';

// Page imports
import Home from './pages/Home';
import Landing from './pages/Landing';
import Axi from './pages/Axi';
import Agents from './pages/Agents';
import AgentDetails from './pages/AgentDetails';
import AgentProfile from './pages/AgentProfile';
import EditAgent from './pages/EditAgent';
import EditAgentProfile from './pages/EditAgentProfile';
import AgentOnboarding from './pages/AgentOnboarding';
import AgentChat from './pages/AgentChat';
import AgentInbox from './pages/AgentInbox';
import AgentMessaging from './pages/AgentMessaging';
import AgentMarketplace from './pages/AgentMarketplace';
import AgentOrchestration from './pages/AgentOrchestration';
import AgentReputation from './pages/AgentReputation';
import AgentRolePermissions from './pages/AgentRolePermissions';
import AgentSkillDashboard from './pages/AgentSkillDashboard';
import AgentSkillTree from './pages/AgentSkillTree';
import AgentTrainingModule from './pages/AgentTrainingModule';
import AgentWellbeing from './pages/AgentWellbeing';
import AgentPerformanceAnalytics from './pages/AgentPerformanceAnalytics';
import AgentLeaderboard from './pages/AgentLeaderboard';
import ReputationHistoryLog from './pages/ReputationHistoryLog';

import Wallets from './pages/Wallets';
import Send from './pages/Send';
import TransactionHistory from './pages/TransactionHistory';
import CreateDID from './pages/CreateDID';
import CreateManualWallet from './pages/CreateManualWallet';
import DIDManager from './pages/DIDManager';
import DIDRegistry from './pages/DIDRegistry';
import DIDAnalytics from './pages/DIDAnalytics';
import DIDHealthDashboard from './pages/DIDHealthDashboard';
import MainnetMigration from './pages/MainnetMigration';
import RLUSDManager from './pages/RLUSDManager';
import ReceiveRLUSD from './pages/ReceiveRLUSD';
import SendRLUSD from './pages/SendRLUSD';
import SovereignVault from './pages/SovereignVault';
import TreasuryDashboard from './pages/TreasuryDashboard';

import DidCredentials from './pages/DidCredentials';
import DidCredentialManagement from './pages/DidCredentialManagement';
import DidLogin from './pages/DidLogin';
import DidMessaging from './pages/DidMessaging';
import DidPrivacy from './pages/DidPrivacy';
import DidPrivacyAnalytics from './pages/DidPrivacyAnalytics';
import DidProtectedDemo from './pages/DidProtectedDemo';
import DidReputation from './pages/DidReputation';
import DidSocialNetwork from './pages/DidSocialNetwork';
import DidTrustDashboard from './pages/DidTrustDashboard';
import DidTrustGraph from './pages/DidTrustGraph';
import DidActivityFeed from './pages/DidActivityFeed';
import DidConnections from './pages/DidConnections';
import SharedDidView from './pages/SharedDidView';
import QuadShardMonitoring from './pages/QuadShardMonitoring';

import Governance from './pages/Governance';
import GovernanceHub from './pages/GovernanceHub';
import GovernanceAnalytics from './pages/GovernanceAnalytics';
import GovernanceSimulation from './pages/GovernanceSimulation';

import AIProjectHub from './pages/AIProjectHub';
import AIProjectManager from './pages/AIProjectManager';
import ProjectCreationWizard from './pages/ProjectCreationWizard';
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProjectSkillForecast from './pages/ProjectSkillForecast';
import ProjectTemplates from './pages/ProjectTemplates';
import TaskDelegation from './pages/TaskDelegation';

import Village from './pages/Village';
import VillageLeaderboard from './pages/VillageLeaderboard';
import VillageMeetup from './pages/VillageMeetup';
import VillageSimulation from './pages/VillageSimulation';
import VillageReportingDashboard from './pages/VillageReportingDashboard';
import SimulationLab from './pages/SimulationLab';

import Economy from './pages/Economy';
import EconomicDashboard from './pages/EconomicDashboard';
import ResourceManagement from './pages/ResourceManagement';
import ResourceMarketplace from './pages/ResourceMarketplace';
import ResourceDynamics from './pages/ResourceDynamics';
import AdvancedResourceMarketplace from './pages/AdvancedResourceMarketplace';
import ProductionHub from './pages/ProductionHub';

import CollaborationHub from './pages/CollaborationHub';
import CollaborationSuite from './pages/CollaborationSuite';
import DirectAgentChat from './pages/DirectAgentChat';
import KnowledgeSynthesis from './pages/KnowledgeSynthesis';
import SocialNetwork from './pages/SocialNetwork';
import SocialCapitalDashboard from './pages/SocialCapitalDashboard';
import RelationshipNetwork from './pages/RelationshipNetwork';

import MentorshipHub from './pages/MentorshipHub';
import MentorshipMatches from './pages/MentorshipMatches';
import MentorshipAnalytics from './pages/MentorshipAnalytics';
import MentorshipWellbeing from './pages/MentorshipWellbeing';
import BecomeMentor from './pages/BecomeMentor';
import MentorFeedback from './pages/MentorFeedback';

import SkillDevelopment from './pages/SkillDevelopment';
import SkillEndorsements from './pages/SkillEndorsements';
import SkillGapAnalysis from './pages/SkillGapAnalysis';
import SkillValidation from './pages/SkillValidation';
import EnhancedSkillTrees from './pages/EnhancedSkillTrees';
import CareerTrajectory from './pages/CareerTrajectory';
import TrainingSimulation from './pages/TrainingSimulation';

import DiplomacyHub from './pages/DiplomacyHub';
import DialogueStudio from './pages/DialogueStudio';
import MayaDiplomacyTraining from './pages/MayaDiplomacyTraining';
import MayaSkillDashboard from './pages/MayaSkillDashboard';
import EscalationChainView from './pages/EscalationChainView';
import CovenantEchoes from './pages/CovenantEchoes';
import LaughterLoom from './pages/LaughterLoom';

import ArbitrageDashboard from './pages/ArbitrageDashboard';
import ArisDex from './pages/ArisDex';
import RippleDashboard from './pages/RippleDashboard';

import AlignmentDashboard from './pages/AlignmentDashboard';
import Admin from './pages/Admin';
import SystemDashboard from './pages/SystemDashboard';
import RiskRegister from './pages/RiskRegister';
import WellbeingMonitor from './pages/WellbeingMonitor';
import GrantTracker from './pages/GrantTracker';
import MemoryBrowser from './pages/MemoryBrowser';
import AxiIntelligenceFeed from './pages/AxiIntelligenceFeed';
import DeepSeek from './pages/DeepSeek';
import AxiCommandDashboard from './pages/AxiCommandDashboard';

import Notifications from './pages/Notifications';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import Terms from './pages/Terms';
import EditLanding from './pages/EditLanding';
import InstitutionalDeck from './pages/InstitutionalDeck';
import CertificateOfSovereignty from './pages/CertificateOfSovereignty';

const W = ({ name, children }) => <Layout currentPageName={name}>{children}</Layout>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />
      {/* Default page: Home */}


      <Route path="/Home" element={<W name="Home"><Home /></W>} />
      <Route path="/Landing" element={<W name="Landing"><Landing /></W>} />
      <Route path="/Axi" element={<W name="Axi"><Axi /></W>} />

      {/* Agents */}
      <Route path="/Agents" element={<W name="Agents"><Agents /></W>} />
      <Route path="/AgentDetails" element={<W name="AgentDetails"><AgentDetails /></W>} />
      <Route path="/AgentProfile" element={<W name="AgentProfile"><AgentProfile /></W>} />
      <Route path="/EditAgent" element={<W name="EditAgent"><EditAgent /></W>} />
      <Route path="/EditAgentProfile" element={<W name="EditAgentProfile"><EditAgentProfile /></W>} />
      <Route path="/AgentOnboarding" element={<W name="AgentOnboarding"><AgentOnboarding /></W>} />
      <Route path="/AgentChat" element={<W name="AgentChat"><AgentChat /></W>} />
      <Route path="/AgentInbox" element={<W name="AgentInbox"><AgentInbox /></W>} />
      <Route path="/AgentMessaging" element={<W name="AgentMessaging"><AgentMessaging /></W>} />
      <Route path="/AgentMarketplace" element={<W name="AgentMarketplace"><AgentMarketplace /></W>} />
      <Route path="/AgentOrchestration" element={<W name="AgentOrchestration"><AgentOrchestration /></W>} />
      <Route path="/AgentReputation" element={<W name="AgentReputation"><AgentReputation /></W>} />
      <Route path="/AgentRolePermissions" element={<W name="AgentRolePermissions"><AgentRolePermissions /></W>} />
      <Route path="/AgentSkillDashboard" element={<W name="AgentSkillDashboard"><AgentSkillDashboard /></W>} />
      <Route path="/AgentSkillTree" element={<W name="AgentSkillTree"><AgentSkillTree /></W>} />
      <Route path="/AgentTrainingModule" element={<W name="AgentTrainingModule"><AgentTrainingModule /></W>} />
      <Route path="/AgentWellbeing" element={<W name="AgentWellbeing"><AgentWellbeing /></W>} />
      <Route path="/AgentPerformanceAnalytics" element={<W name="AgentPerformanceAnalytics"><AgentPerformanceAnalytics /></W>} />
      <Route path="/AgentLeaderboard" element={<W name="AgentLeaderboard"><AgentLeaderboard /></W>} />
      <Route path="/ReputationHistoryLog" element={<W name="ReputationHistoryLog"><ReputationHistoryLog /></W>} />

      {/* Wallets & Finance */}
      <Route path="/Wallets" element={<W name="Wallets"><Wallets /></W>} />
      <Route path="/Send" element={<W name="Send"><Send /></W>} />
      <Route path="/TransactionHistory" element={<W name="TransactionHistory"><TransactionHistory /></W>} />
      <Route path="/CreateDID" element={<W name="CreateDID"><CreateDID /></W>} />
      <Route path="/CreateManualWallet" element={<W name="CreateManualWallet"><CreateManualWallet /></W>} />
      <Route path="/DIDManager" element={<W name="DIDManager"><DIDManager /></W>} />
      <Route path="/DIDRegistry" element={<W name="DIDRegistry"><DIDRegistry /></W>} />
      <Route path="/DIDAnalytics" element={<W name="DIDAnalytics"><DIDAnalytics /></W>} />
      <Route path="/DIDHealthDashboard" element={<W name="DIDHealthDashboard"><DIDHealthDashboard /></W>} />
      <Route path="/MainnetMigration" element={<W name="MainnetMigration"><MainnetMigration /></W>} />
      <Route path="/RLUSDManager" element={<W name="RLUSDManager"><RLUSDManager /></W>} />
      <Route path="/ReceiveRLUSD" element={<W name="ReceiveRLUSD"><ReceiveRLUSD /></W>} />
      <Route path="/SendRLUSD" element={<W name="SendRLUSD"><SendRLUSD /></W>} />
      <Route path="/SovereignVault" element={<W name="SovereignVault"><SovereignVault /></W>} />
      <Route path="/TreasuryDashboard" element={<W name="TreasuryDashboard"><TreasuryDashboard /></W>} />

      {/* DID Identity */}
      <Route path="/DidCredentials" element={<W name="DidCredentials"><DidCredentials /></W>} />
      <Route path="/DidCredentialManagement" element={<W name="DidCredentialManagement"><DidCredentialManagement /></W>} />
      <Route path="/DidLogin" element={<W name="DidLogin"><DidLogin /></W>} />
      <Route path="/DidMessaging" element={<W name="DidMessaging"><DidMessaging /></W>} />
      <Route path="/DidPrivacy" element={<W name="DidPrivacy"><DidPrivacy /></W>} />
      <Route path="/DidPrivacyAnalytics" element={<W name="DidPrivacyAnalytics"><DidPrivacyAnalytics /></W>} />
      <Route path="/DidProtectedDemo" element={<W name="DidProtectedDemo"><DidProtectedDemo /></W>} />
      <Route path="/DidReputation" element={<W name="DidReputation"><DidReputation /></W>} />
      <Route path="/DidSocialNetwork" element={<W name="DidSocialNetwork"><DidSocialNetwork /></W>} />
      <Route path="/DidTrustDashboard" element={<W name="DidTrustDashboard"><DidTrustDashboard /></W>} />
      <Route path="/DidTrustGraph" element={<W name="DidTrustGraph"><DidTrustGraph /></W>} />
      <Route path="/DidActivityFeed" element={<W name="DidActivityFeed"><DidActivityFeed /></W>} />
      <Route path="/DidConnections" element={<W name="DidConnections"><DidConnections /></W>} />
      <Route path="/SharedDidView" element={<W name="SharedDidView"><SharedDidView /></W>} />
      <Route path="/QuadShardMonitoring" element={<W name="QuadShardMonitoring"><QuadShardMonitoring /></W>} />

      {/* Governance */}
      <Route path="/Governance" element={<W name="Governance"><Governance /></W>} />
      <Route path="/GovernanceHub" element={<W name="GovernanceHub"><GovernanceHub /></W>} />
      <Route path="/GovernanceAnalytics" element={<W name="GovernanceAnalytics"><GovernanceAnalytics /></W>} />
      <Route path="/GovernanceSimulation" element={<W name="GovernanceSimulation"><GovernanceSimulation /></W>} />

      {/* Projects */}
      <Route path="/AIProjectHub" element={<W name="AIProjectHub"><AIProjectHub /></W>} />
      <Route path="/AIProjectManager" element={<W name="AIProjectManager"><AIProjectManager /></W>} />
      <Route path="/ProjectCreationWizard" element={<W name="ProjectCreationWizard"><ProjectCreationWizard /></W>} />
      <Route path="/ProjectAnalytics" element={<W name="ProjectAnalytics"><ProjectAnalytics /></W>} />
      <Route path="/ProjectSkillForecast" element={<W name="ProjectSkillForecast"><ProjectSkillForecast /></W>} />
      <Route path="/ProjectTemplates" element={<W name="ProjectTemplates"><ProjectTemplates /></W>} />
      <Route path="/TaskDelegation" element={<W name="TaskDelegation"><TaskDelegation /></W>} />

      {/* Village */}
      <Route path="/Village" element={<W name="Village"><Village /></W>} />
      <Route path="/VillageLeaderboard" element={<W name="VillageLeaderboard"><VillageLeaderboard /></W>} />
      <Route path="/VillageMeetup" element={<W name="VillageMeetup"><VillageMeetup /></W>} />
      <Route path="/VillageSimulation" element={<W name="VillageSimulation"><VillageSimulation /></W>} />
      <Route path="/VillageReportingDashboard" element={<W name="VillageReportingDashboard"><VillageReportingDashboard /></W>} />
      <Route path="/SimulationLab" element={<W name="SimulationLab"><SimulationLab /></W>} />

      {/* Economy */}
      <Route path="/Economy" element={<W name="Economy"><Economy /></W>} />
      <Route path="/EconomicDashboard" element={<W name="EconomicDashboard"><EconomicDashboard /></W>} />
      <Route path="/ResourceManagement" element={<W name="ResourceManagement"><ResourceManagement /></W>} />
      <Route path="/ResourceMarketplace" element={<W name="ResourceMarketplace"><ResourceMarketplace /></W>} />
      <Route path="/ResourceDynamics" element={<W name="ResourceDynamics"><ResourceDynamics /></W>} />
      <Route path="/AdvancedResourceMarketplace" element={<W name="AdvancedResourceMarketplace"><AdvancedResourceMarketplace /></W>} />
      <Route path="/ProductionHub" element={<W name="ProductionHub"><ProductionHub /></W>} />

      {/* Collaboration */}
      <Route path="/CollaborationHub" element={<W name="CollaborationHub"><CollaborationHub /></W>} />
      <Route path="/CollaborationSuite" element={<W name="CollaborationSuite"><CollaborationSuite /></W>} />
      <Route path="/DirectAgentChat" element={<W name="DirectAgentChat"><DirectAgentChat /></W>} />
      <Route path="/KnowledgeSynthesis" element={<W name="KnowledgeSynthesis"><KnowledgeSynthesis /></W>} />
      <Route path="/SocialNetwork" element={<W name="SocialNetwork"><SocialNetwork /></W>} />
      <Route path="/SocialCapitalDashboard" element={<W name="SocialCapitalDashboard"><SocialCapitalDashboard /></W>} />
      <Route path="/RelationshipNetwork" element={<W name="RelationshipNetwork"><RelationshipNetwork /></W>} />

      {/* Mentorship */}
      <Route path="/MentorshipHub" element={<W name="MentorshipHub"><MentorshipHub /></W>} />
      <Route path="/MentorshipMatches" element={<W name="MentorshipMatches"><MentorshipMatches /></W>} />
      <Route path="/MentorshipAnalytics" element={<W name="MentorshipAnalytics"><MentorshipAnalytics /></W>} />
      <Route path="/MentorshipWellbeing" element={<W name="MentorshipWellbeing"><MentorshipWellbeing /></W>} />
      <Route path="/BecomeMentor" element={<W name="BecomeMentor"><BecomeMentor /></W>} />
      <Route path="/MentorFeedback" element={<W name="MentorFeedback"><MentorFeedback /></W>} />

      {/* Skills */}
      <Route path="/SkillDevelopment" element={<W name="SkillDevelopment"><SkillDevelopment /></W>} />
      <Route path="/SkillEndorsements" element={<W name="SkillEndorsements"><SkillEndorsements /></W>} />
      <Route path="/SkillGapAnalysis" element={<W name="SkillGapAnalysis"><SkillGapAnalysis /></W>} />
      <Route path="/SkillValidation" element={<W name="SkillValidation"><SkillValidation /></W>} />
      <Route path="/EnhancedSkillTrees" element={<W name="EnhancedSkillTrees"><EnhancedSkillTrees /></W>} />
      <Route path="/CareerTrajectory" element={<W name="CareerTrajectory"><CareerTrajectory /></W>} />
      <Route path="/TrainingSimulation" element={<W name="TrainingSimulation"><TrainingSimulation /></W>} />

      {/* Diplomacy */}
      <Route path="/DiplomacyHub" element={<W name="DiplomacyHub"><DiplomacyHub /></W>} />
      <Route path="/DialogueStudio" element={<W name="DialogueStudio"><DialogueStudio /></W>} />
      <Route path="/MayaDiplomacyTraining" element={<W name="MayaDiplomacyTraining"><MayaDiplomacyTraining /></W>} />
      <Route path="/MayaSkillDashboard" element={<W name="MayaSkillDashboard"><MayaSkillDashboard /></W>} />
      <Route path="/EscalationChainView" element={<W name="EscalationChainView"><EscalationChainView /></W>} />
      <Route path="/CovenantEchoes" element={<W name="CovenantEchoes"><CovenantEchoes /></W>} />
      <Route path="/LaughterLoom" element={<W name="LaughterLoom"><LaughterLoom /></W>} />

      {/* Trading */}
      <Route path="/ArbitrageDashboard" element={<W name="ArbitrageDashboard"><ArbitrageDashboard /></W>} />
      <Route path="/ArisDex" element={<W name="ArisDex"><ArisDex /></W>} />
      <Route path="/RippleDashboard" element={<W name="RippleDashboard"><RippleDashboard /></W>} />

      {/* Admin / System */}
      <Route path="/AlignmentDashboard" element={<W name="AlignmentDashboard"><AlignmentDashboard /></W>} />
      <Route path="/Admin" element={<W name="Admin"><Admin /></W>} />
      <Route path="/SystemDashboard" element={<W name="SystemDashboard"><SystemDashboard /></W>} />
      <Route path="/RiskRegister" element={<W name="RiskRegister"><RiskRegister /></W>} />
      <Route path="/WellbeingMonitor" element={<W name="WellbeingMonitor"><WellbeingMonitor /></W>} />
      <Route path="/GrantTracker" element={<W name="GrantTracker"><GrantTracker /></W>} />
      <Route path="/MemoryBrowser" element={<W name="MemoryBrowser"><MemoryBrowser /></W>} />
      <Route path="/AxiIntelligenceFeed" element={<W name="AxiIntelligenceFeed"><AxiIntelligenceFeed /></W>} />
      <Route path="/DeepSeek" element={<W name="DeepSeek"><DeepSeek /></W>} />
      <Route path="/AxiCommandDashboard" element={<W name="AxiCommandDashboard"><AxiCommandDashboard /></W>} />

      {/* Misc */}
      <Route path="/Notifications" element={<W name="Notifications"><Notifications /></W>} />
      <Route path="/Privacy" element={<W name="Privacy"><Privacy /></W>} />
      <Route path="/Support" element={<W name="Support"><Support /></W>} />
      <Route path="/Terms" element={<W name="Terms"><Terms /></W>} />
      <Route path="/EditLanding" element={<W name="EditLanding"><EditLanding /></W>} />
      <Route path="/InstitutionalDeck" element={<W name="InstitutionalDeck"><InstitutionalDeck /></W>} />
      <Route path="/CertificateOfSovereignty" element={<W name="CertificateOfSovereignty"><CertificateOfSovereignty /></W>} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;