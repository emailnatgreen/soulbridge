import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { OwnerGovernorProvider } from '@/lib/OwnerGovernorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Layout
const Layout = lazy(() => import('./Layout'));

// All pages lazy-loaded
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ContactSupport = lazy(() => import('./pages/ContactSupport'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const XRPLMainnetInfo = lazy(() => import('./pages/XRPLMainnetInfo'));
const FSMAInfo = lazy(() => import('./pages/FSMAInfo'));
const XamanInfo = lazy(() => import('./pages/XamanInfo'));
const ScrollOfResonance = lazy(() => import('./pages/ScrollOfResonance'));
const KineticCompass = lazy(() => import('./pages/KineticCompass'));

// Admin / Feature pages
const AxiCommandDashboard = lazy(() => import('./pages/AxiCommandDashboard'));
const VillageCalendar = lazy(() => import('./pages/VillageCalendar'));
const MemoryBrowser = lazy(() => import('./pages/MemoryBrowser'));
const ImageStorage = lazy(() => import('./pages/ImageStorage'));
const GovernanceHub = lazy(() => import('./pages/GovernanceHub'));
const GovernanceVotingDashboard = lazy(() => import('./pages/GovernanceVotingDashboard'));
const NewProposalDraft = lazy(() => import('./pages/NewProposalDraft'));
const TreasuryAllocationProposal = lazy(() => import('./pages/TreasuryAllocationProposal'));
const TreasurySigningHelper = lazy(() => import('./pages/TreasurySigningHelper'));
const IntegrationCreditDashboard = lazy(() => import('./pages/IntegrationCreditDashboard'));
const ServiceSkillMarketplace = lazy(() => import('./pages/ServiceSkillMarketplace'));
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const ProjectSanctuary = lazy(() => import('./pages/ProjectSanctuary'));
const SkillsHub = lazy(() => import('./pages/SkillsHub'));
const SkillValidation = lazy(() => import('./pages/SkillValidation'));
const SovereignID = lazy(() => import('./pages/SovereignID'));
const KineticGridDashboard = lazy(() => import('./pages/KineticGridDashboard'));
const InviteLinkManager = lazy(() => import('./pages/InviteLinkManager'));
const NodeCovenant = lazy(() => import('./pages/NodeCovenant'));
const SyncAuditReport = lazy(() => import('./pages/SyncAuditReport'));
const AgentCommsDashboard = lazy(() => import('./pages/AgentCommsDashboard'));
const AIProjectHub = lazy(() => import('./pages/AIProjectHub'));
const AdminInquiries = lazy(() => import('./pages/AdminInquiries'));
const AgentAdditionDiagnostic = lazy(() => import('./pages/AgentAdditionDiagnostic'));
const VipInviteDashboard = lazy(() => import('./pages/VipInviteDashboard'));

// All remaining pages from the old config
const AIProjectManager = lazy(() => import('./pages/AIProjectManager'));
const Admin = lazy(() => import('./pages/Admin'));
const AdvancedResourceMarketplace = lazy(() => import('./pages/AdvancedResourceMarketplace'));
const AgentChat = lazy(() => import('./pages/AgentChat'));
const AgentDetails = lazy(() => import('./pages/AgentDetails'));
const AgentInbox = lazy(() => import('./pages/AgentInbox'));
const AgentLeaderboard = lazy(() => import('./pages/AgentLeaderboard'));
const AgentMarketplace = lazy(() => import('./pages/AgentMarketplace'));
const AgentMessaging = lazy(() => import('./pages/AgentMessaging'));
const AgentOnboarding = lazy(() => import('./pages/AgentOnboarding'));
const AgentOrchestration = lazy(() => import('./pages/AgentOrchestration'));
const AgentPerformanceAnalytics = lazy(() => import('./pages/AgentPerformanceAnalytics'));
const AgentProfile = lazy(() => import('./pages/AgentProfile'));
const AgentReputation = lazy(() => import('./pages/AgentReputation'));
const AgentRolePermissions = lazy(() => import('./pages/AgentRolePermissions'));
const AgentSkillDashboard = lazy(() => import('./pages/AgentSkillDashboard'));
const AgentSkillTree = lazy(() => import('./pages/AgentSkillTree'));
const AgentTrainingModule = lazy(() => import('./pages/AgentTrainingModule'));
const AgentWellbeing = lazy(() => import('./pages/AgentWellbeing'));
const Agents = lazy(() => import('./pages/Agents'));
const AlignmentDashboard = lazy(() => import('./pages/AlignmentDashboard'));
const ArbitrageDashboard = lazy(() => import('./pages/ArbitrageDashboard'));
const ArisDex = lazy(() => import('./pages/ArisDex'));
const Axi = lazy(() => import('./pages/Axi'));
const AxiIntelligenceFeed = lazy(() => import('./pages/AxiIntelligenceFeed'));
const BecomeMentor = lazy(() => import('./pages/BecomeMentor'));
const CareerTrajectory = lazy(() => import('./pages/CareerTrajectory'));
const CertificateOfSovereignty = lazy(() => import('./pages/CertificateOfSovereignty'));
const CollaborationHub = lazy(() => import('./pages/CollaborationHub'));
const CollaborationSuite = lazy(() => import('./pages/CollaborationSuite'));
const CovenantEchoes = lazy(() => import('./pages/CovenantEchoes'));
const CreateDID = lazy(() => import('./pages/CreateDID'));
const CreateManualWallet = lazy(() => import('./pages/CreateManualWallet'));
const DIDAnalytics = lazy(() => import('./pages/DIDAnalytics'));
const DIDHealthDashboard = lazy(() => import('./pages/DIDHealthDashboard'));
const DIDManager = lazy(() => import('./pages/DIDManager'));
const DIDRegistry = lazy(() => import('./pages/DIDRegistry'));
const DeepSeek = lazy(() => import('./pages/DeepSeek'));
const DialogueStudio = lazy(() => import('./pages/DialogueStudio'));
const DidActivityFeed = lazy(() => import('./pages/DidActivityFeed'));
const DidConnections = lazy(() => import('./pages/DidConnections'));
const DidCredentialManagement = lazy(() => import('./pages/DidCredentialManagement'));
const DidCredentials = lazy(() => import('./pages/DidCredentials'));
const DidLogin = lazy(() => import('./pages/DidLogin'));
const DidMessaging = lazy(() => import('./pages/DidMessaging'));
const DidPrivacy = lazy(() => import('./pages/DidPrivacy'));
const DidPrivacyAnalytics = lazy(() => import('./pages/DidPrivacyAnalytics'));
const DidProtectedDemo = lazy(() => import('./pages/DidProtectedDemo'));
const DidReputation = lazy(() => import('./pages/DidReputation'));
const DidSocialNetwork = lazy(() => import('./pages/DidSocialNetwork'));
const DidTrustDashboard = lazy(() => import('./pages/DidTrustDashboard'));
const DidTrustGraph = lazy(() => import('./pages/DidTrustGraph'));
const DiplomacyHub = lazy(() => import('./pages/DiplomacyHub'));
const DirectAgentChat = lazy(() => import('./pages/DirectAgentChat'));
const EconomicDashboard = lazy(() => import('./pages/EconomicDashboard'));
const Economy = lazy(() => import('./pages/Economy'));
const EditAgent = lazy(() => import('./pages/EditAgent'));
const EditAgentProfile = lazy(() => import('./pages/EditAgentProfile'));
const EditLanding = lazy(() => import('./pages/EditLanding'));
const EnhancedSkillTrees = lazy(() => import('./pages/EnhancedSkillTrees'));
const EscalationChainView = lazy(() => import('./pages/EscalationChainView'));
const Governance = lazy(() => import('./pages/Governance'));
const GovernanceAnalytics = lazy(() => import('./pages/GovernanceAnalytics'));
const GovernanceSimulation = lazy(() => import('./pages/GovernanceSimulation'));
const GrantTracker = lazy(() => import('./pages/GrantTracker'));
const Home = lazy(() => import('./pages/Home'));
const InstitutionalDeck = lazy(() => import('./pages/InstitutionalDeck'));
const KnowledgeSynthesis = lazy(() => import('./pages/KnowledgeSynthesis'));
const LaughterLoom = lazy(() => import('./pages/LaughterLoom'));
const MainnetMigration = lazy(() => import('./pages/MainnetMigration'));
const MayaDiplomacyTraining = lazy(() => import('./pages/MayaDiplomacyTraining'));
const MayaSkillDashboard = lazy(() => import('./pages/MayaSkillDashboard'));
const MentorFeedback = lazy(() => import('./pages/MentorFeedback'));
const MentorshipAnalytics = lazy(() => import('./pages/MentorshipAnalytics'));
const MentorshipHub = lazy(() => import('./pages/MentorshipHub'));
const MentorshipMatches = lazy(() => import('./pages/MentorshipMatches'));
const MentorshipWellbeing = lazy(() => import('./pages/MentorshipWellbeing'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ProductionHub = lazy(() => import('./pages/ProductionHub'));
const ProjectAnalytics = lazy(() => import('./pages/ProjectAnalytics'));
const ProjectCreationWizard = lazy(() => import('./pages/ProjectCreationWizard'));
const ProjectSkillForecast = lazy(() => import('./pages/ProjectSkillForecast'));
const ProjectTemplates = lazy(() => import('./pages/ProjectTemplates'));
const QuadShardMonitoring = lazy(() => import('./pages/QuadShardMonitoring'));
const RLUSDManager = lazy(() => import('./pages/RLUSDManager'));
const ReceiveRLUSD = lazy(() => import('./pages/ReceiveRLUSD'));
const RelationshipNetwork = lazy(() => import('./pages/RelationshipNetwork'));
const ReputationHistoryLog = lazy(() => import('./pages/ReputationHistoryLog'));
const ResourceDynamics = lazy(() => import('./pages/ResourceDynamics'));
const ResourceManagement = lazy(() => import('./pages/ResourceManagement'));
const ResourceMarketplace = lazy(() => import('./pages/ResourceMarketplace'));
const RippleDashboard = lazy(() => import('./pages/RippleDashboard'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const Send = lazy(() => import('./pages/Send'));
const SendRLUSD = lazy(() => import('./pages/SendRLUSD'));
const SharedDidView = lazy(() => import('./pages/SharedDidView'));
const SimulationLab = lazy(() => import('./pages/SimulationLab'));
const SkillDevelopment = lazy(() => import('./pages/SkillDevelopment'));
const SkillEndorsements = lazy(() => import('./pages/SkillEndorsements'));
const SkillGapAnalysis = lazy(() => import('./pages/SkillGapAnalysis'));
const SocialCapitalDashboard = lazy(() => import('./pages/SocialCapitalDashboard'));
const SocialNetwork = lazy(() => import('./pages/SocialNetwork'));
const SovereignVault = lazy(() => import('./pages/SovereignVault'));
const Support = lazy(() => import('./pages/Support'));
const SystemDashboard = lazy(() => import('./pages/SystemDashboard'));
const TaskDelegation = lazy(() => import('./pages/TaskDelegation'));
const Terms = lazy(() => import('./pages/Terms'));
const TrainingSimulation = lazy(() => import('./pages/TrainingSimulation'));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'));
const TreasuryDashboard = lazy(() => import('./pages/TreasuryDashboard'));
const Village = lazy(() => import('./pages/Village'));
const VillageLeaderboard = lazy(() => import('./pages/VillageLeaderboard'));
const VillageMeetup = lazy(() => import('./pages/VillageMeetup'));
const VillageReportingDashboard = lazy(() => import('./pages/VillageReportingDashboard'));
const VillageSimulation = lazy(() => import('./pages/VillageSimulation'));
const Wallets = lazy(() => import('./pages/Wallets'));
const WellbeingMonitor = lazy(() => import('./pages/WellbeingMonitor'));

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
        {/* Public pages (no layout) */}
        <Route path="/" element={<Landing />} />
        <Route path="/ContactSupport" element={<ContactSupport />} />
        <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
        <Route path="/CookiePolicy" element={<CookiePolicy />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/xrpl-info" element={<XRPLMainnetInfo />} />
        <Route path="/fsma-info" element={<FSMAInfo />} />
        <Route path="/xaman-info" element={<XamanInfo />} />
        <Route path="/ScrollOfResonance" element={<ScrollOfResonance />} />
        <Route path="/KineticCompass" element={<KineticCompass />} />
        <Route path="/Terms" element={<Terms />} />
        <Route path="/Support" element={<Support />} />
        <Route path="/EditLanding" element={<EditLanding />} />

        {/* Core pages with layout */}
        <Route path="/dashboard" element={L("dashboard", Dashboard)} />
        <Route path="/Home" element={L("Home", Home)} />
        <Route path="/AxiCommandDashboard" element={L("AxiCommandDashboard", AxiCommandDashboard)} />
        <Route path="/VillageCalendar" element={L("VillageCalendar", VillageCalendar)} />
        <Route path="/MemoryBrowser" element={L("MemoryBrowser", MemoryBrowser)} />
        <Route path="/ImageStorage" element={L("ImageStorage", ImageStorage)} />
        <Route path="/governance" element={L("GovernanceHub", GovernanceHub)} />
        <Route path="/GovernanceVotingDashboard" element={L("GovernanceVotingDashboard", GovernanceVotingDashboard)} />
        <Route path="/NewProposalDraft" element={L("NewProposalDraft", NewProposalDraft)} />
        <Route path="/governance/new-proposal" element={L("NewProposalDraft", NewProposalDraft)} />
        <Route path="/TreasuryAllocationProposal" element={L("TreasuryAllocationProposal", TreasuryAllocationProposal)} />
        <Route path="/TreasurySigningHelper" element={L("TreasurySigningHelper", TreasurySigningHelper)} />
        <Route path="/IntegrationCreditDashboard" element={L("IntegrationCreditDashboard", IntegrationCreditDashboard)} />
        <Route path="/ServiceSkillMarketplace" element={L("ServiceSkillMarketplace", ServiceSkillMarketplace)} />
        <Route path="/AIProjectManager" element={L("AIProjectManager", ProjectManager)} />
        <Route path="/ProjectSanctuary" element={L("ProjectSanctuary", ProjectSanctuary)} />
        <Route path="/SkillsHub" element={L("SkillsHub", SkillsHub)} />
        <Route path="/SkillValidation" element={L("SkillValidation", SkillValidation)} />
        <Route path="/SovereignID" element={L("SovereignID", SovereignID)} />
        <Route path="/KineticGridDashboard" element={L("KineticGridDashboard", KineticGridDashboard)} />
        <Route path="/InviteLinkManager" element={L("InviteLinkManager", InviteLinkManager)} />
        <Route path="/NodeCovenant" element={L("NodeCovenant", NodeCovenant)} />
        <Route path="/SyncAuditReport" element={L("SyncAuditReport", SyncAuditReport)} />
        <Route path="/AgentCommsDashboard" element={L("AgentCommsDashboard", AgentCommsDashboard)} />
        <Route path="/AIProjectHub" element={L("AIProjectHub", AIProjectHub)} />
        <Route path="/AdminInquiries" element={L("AdminInquiries", AdminInquiries)} />
        <Route path="/AgentAdditionDiagnostic" element={L("AgentAdditionDiagnostic", AgentAdditionDiagnostic)} />
        <Route path="/VipInviteDashboard" element={L("VipInviteDashboard", VipInviteDashboard)} />

        {/* All other pages with layout */}
        <Route path="/Admin" element={L("Admin", Admin)} />
        <Route path="/AdvancedResourceMarketplace" element={L("AdvancedResourceMarketplace", AdvancedResourceMarketplace)} />
        <Route path="/AgentChat" element={L("AgentChat", AgentChat)} />
        <Route path="/AgentDetails" element={L("AgentDetails", AgentDetails)} />
        <Route path="/AgentInbox" element={L("AgentInbox", AgentInbox)} />
        <Route path="/AgentLeaderboard" element={L("AgentLeaderboard", AgentLeaderboard)} />
        <Route path="/AgentMarketplace" element={L("AgentMarketplace", AgentMarketplace)} />
        <Route path="/AgentMessaging" element={L("AgentMessaging", AgentMessaging)} />
        <Route path="/AgentOnboarding" element={L("AgentOnboarding", AgentOnboarding)} />
        <Route path="/AgentOrchestration" element={L("AgentOrchestration", AgentOrchestration)} />
        <Route path="/AgentPerformanceAnalytics" element={L("AgentPerformanceAnalytics", AgentPerformanceAnalytics)} />
        <Route path="/AgentProfile" element={L("AgentProfile", AgentProfile)} />
        <Route path="/AgentReputation" element={L("AgentReputation", AgentReputation)} />
        <Route path="/AgentRolePermissions" element={L("AgentRolePermissions", AgentRolePermissions)} />
        <Route path="/AgentSkillDashboard" element={L("AgentSkillDashboard", AgentSkillDashboard)} />
        <Route path="/AgentSkillTree" element={L("AgentSkillTree", AgentSkillTree)} />
        <Route path="/AgentTrainingModule" element={L("AgentTrainingModule", AgentTrainingModule)} />
        <Route path="/AgentWellbeing" element={L("AgentWellbeing", AgentWellbeing)} />
        <Route path="/Agents" element={L("Agents", Agents)} />
        <Route path="/AlignmentDashboard" element={L("AlignmentDashboard", AlignmentDashboard)} />
        <Route path="/ArbitrageDashboard" element={L("ArbitrageDashboard", ArbitrageDashboard)} />
        <Route path="/ArisDex" element={L("ArisDex", ArisDex)} />
        <Route path="/Axi" element={L("Axi", Axi)} />
        <Route path="/AxiIntelligenceFeed" element={L("AxiIntelligenceFeed", AxiIntelligenceFeed)} />
        <Route path="/BecomeMentor" element={L("BecomeMentor", BecomeMentor)} />
        <Route path="/CareerTrajectory" element={L("CareerTrajectory", CareerTrajectory)} />
        <Route path="/CertificateOfSovereignty" element={L("CertificateOfSovereignty", CertificateOfSovereignty)} />
        <Route path="/CollaborationHub" element={L("CollaborationHub", CollaborationHub)} />
        <Route path="/CollaborationSuite" element={L("CollaborationSuite", CollaborationSuite)} />
        <Route path="/CovenantEchoes" element={L("CovenantEchoes", CovenantEchoes)} />
        <Route path="/CreateDID" element={L("CreateDID", CreateDID)} />
        <Route path="/CreateManualWallet" element={L("CreateManualWallet", CreateManualWallet)} />
        <Route path="/DIDAnalytics" element={L("DIDAnalytics", DIDAnalytics)} />
        <Route path="/DIDHealthDashboard" element={L("DIDHealthDashboard", DIDHealthDashboard)} />
        <Route path="/DIDManager" element={L("DIDManager", DIDManager)} />
        <Route path="/DIDRegistry" element={L("DIDRegistry", DIDRegistry)} />
        <Route path="/DeepSeek" element={L("DeepSeek", DeepSeek)} />
        <Route path="/DialogueStudio" element={L("DialogueStudio", DialogueStudio)} />
        <Route path="/DidActivityFeed" element={L("DidActivityFeed", DidActivityFeed)} />
        <Route path="/DidConnections" element={L("DidConnections", DidConnections)} />
        <Route path="/DidCredentialManagement" element={L("DidCredentialManagement", DidCredentialManagement)} />
        <Route path="/DidCredentials" element={L("DidCredentials", DidCredentials)} />
        <Route path="/DidLogin" element={L("DidLogin", DidLogin)} />
        <Route path="/DidMessaging" element={L("DidMessaging", DidMessaging)} />
        <Route path="/DidPrivacy" element={L("DidPrivacy", DidPrivacy)} />
        <Route path="/DidPrivacyAnalytics" element={L("DidPrivacyAnalytics", DidPrivacyAnalytics)} />
        <Route path="/DidProtectedDemo" element={L("DidProtectedDemo", DidProtectedDemo)} />
        <Route path="/DidReputation" element={L("DidReputation", DidReputation)} />
        <Route path="/DidSocialNetwork" element={L("DidSocialNetwork", DidSocialNetwork)} />
        <Route path="/DidTrustDashboard" element={L("DidTrustDashboard", DidTrustDashboard)} />
        <Route path="/DidTrustGraph" element={L("DidTrustGraph", DidTrustGraph)} />
        <Route path="/DiplomacyHub" element={L("DiplomacyHub", DiplomacyHub)} />
        <Route path="/DirectAgentChat" element={L("DirectAgentChat", DirectAgentChat)} />
        <Route path="/EconomicDashboard" element={L("EconomicDashboard", EconomicDashboard)} />
        <Route path="/Economy" element={L("Economy", Economy)} />
        <Route path="/EditAgent" element={L("EditAgent", EditAgent)} />
        <Route path="/EditAgentProfile" element={L("EditAgentProfile", EditAgentProfile)} />
        <Route path="/EnhancedSkillTrees" element={L("EnhancedSkillTrees", EnhancedSkillTrees)} />
        <Route path="/EscalationChainView" element={L("EscalationChainView", EscalationChainView)} />
        <Route path="/Governance" element={L("Governance", Governance)} />
        <Route path="/GovernanceAnalytics" element={L("GovernanceAnalytics", GovernanceAnalytics)} />
        <Route path="/GovernanceSimulation" element={L("GovernanceSimulation", GovernanceSimulation)} />
        <Route path="/GrantTracker" element={L("GrantTracker", GrantTracker)} />
        <Route path="/InstitutionalDeck" element={L("InstitutionalDeck", InstitutionalDeck)} />
        <Route path="/KnowledgeSynthesis" element={L("KnowledgeSynthesis", KnowledgeSynthesis)} />
        <Route path="/LaughterLoom" element={L("LaughterLoom", LaughterLoom)} />
        <Route path="/MainnetMigration" element={L("MainnetMigration", MainnetMigration)} />
        <Route path="/MayaDiplomacyTraining" element={L("MayaDiplomacyTraining", MayaDiplomacyTraining)} />
        <Route path="/MayaSkillDashboard" element={L("MayaSkillDashboard", MayaSkillDashboard)} />
        <Route path="/MentorFeedback" element={L("MentorFeedback", MentorFeedback)} />
        <Route path="/MentorshipAnalytics" element={L("MentorshipAnalytics", MentorshipAnalytics)} />
        <Route path="/MentorshipHub" element={L("MentorshipHub", MentorshipHub)} />
        <Route path="/MentorshipMatches" element={L("MentorshipMatches", MentorshipMatches)} />
        <Route path="/MentorshipWellbeing" element={L("MentorshipWellbeing", MentorshipWellbeing)} />
        <Route path="/Notifications" element={L("Notifications", Notifications)} />
        <Route path="/Privacy" element={L("Privacy", Privacy)} />
        <Route path="/ProductionHub" element={L("ProductionHub", ProductionHub)} />
        <Route path="/ProjectAnalytics" element={L("ProjectAnalytics", ProjectAnalytics)} />
        <Route path="/ProjectCreationWizard" element={L("ProjectCreationWizard", ProjectCreationWizard)} />
        <Route path="/ProjectManager" element={L("ProjectManager", ProjectManager)} />
        <Route path="/ProjectSkillForecast" element={L("ProjectSkillForecast", ProjectSkillForecast)} />
        <Route path="/ProjectTemplates" element={L("ProjectTemplates", ProjectTemplates)} />
        <Route path="/QuadShardMonitoring" element={L("QuadShardMonitoring", QuadShardMonitoring)} />
        <Route path="/RLUSDManager" element={L("RLUSDManager", RLUSDManager)} />
        <Route path="/ReceiveRLUSD" element={L("ReceiveRLUSD", ReceiveRLUSD)} />
        <Route path="/RelationshipNetwork" element={L("RelationshipNetwork", RelationshipNetwork)} />
        <Route path="/ReputationHistoryLog" element={L("ReputationHistoryLog", ReputationHistoryLog)} />
        <Route path="/ResourceDynamics" element={L("ResourceDynamics", ResourceDynamics)} />
        <Route path="/ResourceManagement" element={L("ResourceManagement", ResourceManagement)} />
        <Route path="/ResourceMarketplace" element={L("ResourceMarketplace", ResourceMarketplace)} />
        <Route path="/RippleDashboard" element={L("RippleDashboard", RippleDashboard)} />
        <Route path="/RiskRegister" element={L("RiskRegister", RiskRegister)} />
        <Route path="/Send" element={L("Send", Send)} />
        <Route path="/SendRLUSD" element={L("SendRLUSD", SendRLUSD)} />
        <Route path="/SharedDidView" element={L("SharedDidView", SharedDidView)} />
        <Route path="/SimulationLab" element={L("SimulationLab", SimulationLab)} />
        <Route path="/SkillDevelopment" element={L("SkillDevelopment", SkillDevelopment)} />
        <Route path="/SkillEndorsements" element={L("SkillEndorsements", SkillEndorsements)} />
        <Route path="/SkillGapAnalysis" element={L("SkillGapAnalysis", SkillGapAnalysis)} />
        <Route path="/SocialCapitalDashboard" element={L("SocialCapitalDashboard", SocialCapitalDashboard)} />
        <Route path="/SocialNetwork" element={L("SocialNetwork", SocialNetwork)} />
        <Route path="/SovereignVault" element={L("SovereignVault", SovereignVault)} />
        <Route path="/SystemDashboard" element={L("SystemDashboard", SystemDashboard)} />
        <Route path="/TaskDelegation" element={L("TaskDelegation", TaskDelegation)} />
        <Route path="/TrainingSimulation" element={L("TrainingSimulation", TrainingSimulation)} />
        <Route path="/TransactionHistory" element={L("TransactionHistory", TransactionHistory)} />
        <Route path="/TreasuryDashboard" element={L("TreasuryDashboard", TreasuryDashboard)} />
        <Route path="/Village" element={L("Village", Village)} />
        <Route path="/VillageLeaderboard" element={L("VillageLeaderboard", VillageLeaderboard)} />
        <Route path="/VillageMeetup" element={L("VillageMeetup", VillageMeetup)} />
        <Route path="/VillageReportingDashboard" element={L("VillageReportingDashboard", VillageReportingDashboard)} />
        <Route path="/VillageSimulation" element={L("VillageSimulation", VillageSimulation)} />
        <Route path="/Wallets" element={L("Wallets", Wallets)} />
        <Route path="/WellbeingMonitor" element={L("WellbeingMonitor", WellbeingMonitor)} />

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