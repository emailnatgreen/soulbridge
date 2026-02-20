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
import AgentChat from './pages/AgentChat';
import AgentDetails from './pages/AgentDetails';
import AgentMarketplace from './pages/AgentMarketplace';
import AgentMessaging from './pages/AgentMessaging';
import AgentProfile from './pages/AgentProfile';
import AgentSkillTree from './pages/AgentSkillTree';
import AgentTrainingModule from './pages/AgentTrainingModule';
import Agents from './pages/Agents';
import Axi from './pages/Axi';
import CollaborationHub from './pages/CollaborationHub';
import CreateManualWallet from './pages/CreateManualWallet';
import DialogueStudio from './pages/DialogueStudio';
import DiplomacyHub from './pages/DiplomacyHub';
import DirectAgentChat from './pages/DirectAgentChat';
import Economy from './pages/Economy';
import EditAgent from './pages/EditAgent';
import EditAgentProfile from './pages/EditAgentProfile';
import Governance from './pages/Governance';
import GovernanceHub from './pages/GovernanceHub';
import GovernanceSimulation from './pages/GovernanceSimulation';
import Home from './pages/Home';
import KnowledgeSynthesis from './pages/KnowledgeSynthesis';
import MainnetMigration from './pages/MainnetMigration';
import Notifications from './pages/Notifications';
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProjectTemplates from './pages/ProjectTemplates';
import RLUSDManager from './pages/RLUSDManager';
import RelationshipNetwork from './pages/RelationshipNetwork';
import ResourceMarketplace from './pages/ResourceMarketplace';
import Send from './pages/Send';
import SimulationLab from './pages/SimulationLab';
import SkillEndorsements from './pages/SkillEndorsements';
import SkillValidation from './pages/SkillValidation';
import SocialCapitalDashboard from './pages/SocialCapitalDashboard';
import SocialNetwork from './pages/SocialNetwork';
import TaskDelegation from './pages/TaskDelegation';
import TrainingSimulation from './pages/TrainingSimulation';
import TransactionHistory from './pages/TransactionHistory';
import Village from './pages/Village';
import VillageSimulation from './pages/VillageSimulation';
import Wallets from './pages/Wallets';
import AgentPerformanceAnalytics from './pages/AgentPerformanceAnalytics';


export const PAGES = {
    "AIProjectHub": AIProjectHub,
    "AIProjectManager": AIProjectManager,
    "AgentChat": AgentChat,
    "AgentDetails": AgentDetails,
    "AgentMarketplace": AgentMarketplace,
    "AgentMessaging": AgentMessaging,
    "AgentProfile": AgentProfile,
    "AgentSkillTree": AgentSkillTree,
    "AgentTrainingModule": AgentTrainingModule,
    "Agents": Agents,
    "Axi": Axi,
    "CollaborationHub": CollaborationHub,
    "CreateManualWallet": CreateManualWallet,
    "DialogueStudio": DialogueStudio,
    "DiplomacyHub": DiplomacyHub,
    "DirectAgentChat": DirectAgentChat,
    "Economy": Economy,
    "EditAgent": EditAgent,
    "EditAgentProfile": EditAgentProfile,
    "Governance": Governance,
    "GovernanceHub": GovernanceHub,
    "GovernanceSimulation": GovernanceSimulation,
    "Home": Home,
    "KnowledgeSynthesis": KnowledgeSynthesis,
    "MainnetMigration": MainnetMigration,
    "Notifications": Notifications,
    "ProjectAnalytics": ProjectAnalytics,
    "ProjectTemplates": ProjectTemplates,
    "RLUSDManager": RLUSDManager,
    "RelationshipNetwork": RelationshipNetwork,
    "ResourceMarketplace": ResourceMarketplace,
    "Send": Send,
    "SimulationLab": SimulationLab,
    "SkillEndorsements": SkillEndorsements,
    "SkillValidation": SkillValidation,
    "SocialCapitalDashboard": SocialCapitalDashboard,
    "SocialNetwork": SocialNetwork,
    "TaskDelegation": TaskDelegation,
    "TrainingSimulation": TrainingSimulation,
    "TransactionHistory": TransactionHistory,
    "Village": Village,
    "VillageSimulation": VillageSimulation,
    "Wallets": Wallets,
    "AgentPerformanceAnalytics": AgentPerformanceAnalytics,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};