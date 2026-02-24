/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIProjectHub from './pages/AIProjectHub';
import AIProjectManager from './pages/AIProjectManager';
import Admin from './pages/Admin';
import AgentChat from './pages/AgentChat';
import AgentDetails from './pages/AgentDetails';
import AgentMarketplace from './pages/AgentMarketplace';
import AgentMessaging from './pages/AgentMessaging';
import AgentPerformanceAnalytics from './pages/AgentPerformanceAnalytics';
import AgentProfile from './pages/AgentProfile';
import AgentReputation from './pages/AgentReputation';
import AgentSkillTree from './pages/AgentSkillTree';
import AgentTrainingModule from './pages/AgentTrainingModule';
import AgentWellbeing from './pages/AgentWellbeing';
import Agents from './pages/Agents';
import Axi from './pages/Axi';
import CollaborationHub from './pages/CollaborationHub';
import CollaborationSuite from './pages/CollaborationSuite';
import CreateDID from './pages/CreateDID';
import CreateManualWallet from './pages/CreateManualWallet';
import DIDAnalytics from './pages/DIDAnalytics';
import DIDManager from './pages/DIDManager';
import DIDRegistry from './pages/DIDRegistry';
import DeepSeek from './pages/DeepSeek';
import DialogueStudio from './pages/DialogueStudio';
import DidActivityFeed from './pages/DidActivityFeed';
import DidConnections from './pages/DidConnections';
import DidCredentials from './pages/DidCredentials';
import DidMessaging from './pages/DidMessaging';
import DidPrivacy from './pages/DidPrivacy';
import DidPrivacyAnalytics from './pages/DidPrivacyAnalytics';
import DidReputation from './pages/DidReputation';
import DidSocialNetwork from './pages/DidSocialNetwork';
import DidTrustDashboard from './pages/DidTrustDashboard';
import DidTrustGraph from './pages/DidTrustGraph';
import DiplomacyHub from './pages/DiplomacyHub';
import DirectAgentChat from './pages/DirectAgentChat';
import Economy from './pages/Economy';
import EditAgent from './pages/EditAgent';
import EditAgentProfile from './pages/EditAgentProfile';
import EditLanding from './pages/EditLanding';
import Governance from './pages/Governance';
import GovernanceHub from './pages/GovernanceHub';
import GovernanceSimulation from './pages/GovernanceSimulation';
import Home from './pages/Home';
import KnowledgeSynthesis from './pages/KnowledgeSynthesis';
import Landing from './pages/Landing';
import MainnetMigration from './pages/MainnetMigration';
import MentorshipHub from './pages/MentorshipHub';
import Notifications from './pages/Notifications';
import Privacy from './pages/Privacy';
import ProductionHub from './pages/ProductionHub';
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProjectTemplates from './pages/ProjectTemplates';
import RLUSDManager from './pages/RLUSDManager';
import ReceiveRLUSD from './pages/ReceiveRLUSD';
import RelationshipNetwork from './pages/RelationshipNetwork';
import ResourceDynamics from './pages/ResourceDynamics';
import ResourceMarketplace from './pages/ResourceMarketplace';
import Send from './pages/Send';
import SendRLUSD from './pages/SendRLUSD';
import SharedDidView from './pages/SharedDidView';
import SimulationLab from './pages/SimulationLab';
import SkillDevelopment from './pages/SkillDevelopment';
import SkillEndorsements from './pages/SkillEndorsements';
import SkillValidation from './pages/SkillValidation';
import SocialCapitalDashboard from './pages/SocialCapitalDashboard';
import SocialNetwork from './pages/SocialNetwork';
import Support from './pages/Support';
import TaskDelegation from './pages/TaskDelegation';
import Terms from './pages/Terms';
import TrainingSimulation from './pages/TrainingSimulation';
import TransactionHistory from './pages/TransactionHistory';
import Village from './pages/Village';
import VillageSimulation from './pages/VillageSimulation';
import Wallets from './pages/Wallets';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIProjectHub": AIProjectHub,
    "AIProjectManager": AIProjectManager,
    "Admin": Admin,
    "AgentChat": AgentChat,
    "AgentDetails": AgentDetails,
    "AgentMarketplace": AgentMarketplace,
    "AgentMessaging": AgentMessaging,
    "AgentPerformanceAnalytics": AgentPerformanceAnalytics,
    "AgentProfile": AgentProfile,
    "AgentReputation": AgentReputation,
    "AgentSkillTree": AgentSkillTree,
    "AgentTrainingModule": AgentTrainingModule,
    "AgentWellbeing": AgentWellbeing,
    "Agents": Agents,
    "Axi": Axi,
    "CollaborationHub": CollaborationHub,
    "CollaborationSuite": CollaborationSuite,
    "CreateDID": CreateDID,
    "CreateManualWallet": CreateManualWallet,
    "DIDAnalytics": DIDAnalytics,
    "DIDManager": DIDManager,
    "DIDRegistry": DIDRegistry,
    "DeepSeek": DeepSeek,
    "DialogueStudio": DialogueStudio,
    "DidActivityFeed": DidActivityFeed,
    "DidConnections": DidConnections,
    "DidCredentials": DidCredentials,
    "DidMessaging": DidMessaging,
    "DidPrivacy": DidPrivacy,
    "DidPrivacyAnalytics": DidPrivacyAnalytics,
    "DidReputation": DidReputation,
    "DidSocialNetwork": DidSocialNetwork,
    "DidTrustDashboard": DidTrustDashboard,
    "DidTrustGraph": DidTrustGraph,
    "DiplomacyHub": DiplomacyHub,
    "DirectAgentChat": DirectAgentChat,
    "Economy": Economy,
    "EditAgent": EditAgent,
    "EditAgentProfile": EditAgentProfile,
    "EditLanding": EditLanding,
    "Governance": Governance,
    "GovernanceHub": GovernanceHub,
    "GovernanceSimulation": GovernanceSimulation,
    "Home": Home,
    "KnowledgeSynthesis": KnowledgeSynthesis,
    "Landing": Landing,
    "MainnetMigration": MainnetMigration,
    "MentorshipHub": MentorshipHub,
    "Notifications": Notifications,
    "Privacy": Privacy,
    "ProductionHub": ProductionHub,
    "ProjectAnalytics": ProjectAnalytics,
    "ProjectTemplates": ProjectTemplates,
    "RLUSDManager": RLUSDManager,
    "ReceiveRLUSD": ReceiveRLUSD,
    "RelationshipNetwork": RelationshipNetwork,
    "ResourceDynamics": ResourceDynamics,
    "ResourceMarketplace": ResourceMarketplace,
    "Send": Send,
    "SendRLUSD": SendRLUSD,
    "SharedDidView": SharedDidView,
    "SimulationLab": SimulationLab,
    "SkillDevelopment": SkillDevelopment,
    "SkillEndorsements": SkillEndorsements,
    "SkillValidation": SkillValidation,
    "SocialCapitalDashboard": SocialCapitalDashboard,
    "SocialNetwork": SocialNetwork,
    "Support": Support,
    "TaskDelegation": TaskDelegation,
    "Terms": Terms,
    "TrainingSimulation": TrainingSimulation,
    "TransactionHistory": TransactionHistory,
    "Village": Village,
    "VillageSimulation": VillageSimulation,
    "Wallets": Wallets,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};