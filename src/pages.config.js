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
import AgentChat from './pages/AgentChat';
import AgentDetails from './pages/AgentDetails';
import AgentMessaging from './pages/AgentMessaging';
import AgentSkillTree from './pages/AgentSkillTree';
import AgentTrainingModule from './pages/AgentTrainingModule';
import Agents from './pages/Agents';
import Axi from './pages/Axi';
import CreateManualWallet from './pages/CreateManualWallet';
import DialogueStudio from './pages/DialogueStudio';
import DiplomacyHub from './pages/DiplomacyHub';
import DirectAgentChat from './pages/DirectAgentChat';
import Economy from './pages/Economy';
import EditAgent from './pages/EditAgent';
import Governance from './pages/Governance';
import GovernanceSimulation from './pages/GovernanceSimulation';
import Home from './pages/Home';
import RelationshipNetwork from './pages/RelationshipNetwork';
import ResourceMarketplace from './pages/ResourceMarketplace';
import Send from './pages/Send';
import SimulationLab from './pages/SimulationLab';
import SocialCapitalDashboard from './pages/SocialCapitalDashboard';
import SocialNetwork from './pages/SocialNetwork';
import TrainingSimulation from './pages/TrainingSimulation';
import TransactionHistory from './pages/TransactionHistory';
import Village from './pages/Village';
import VillageSimulation from './pages/VillageSimulation';
import Wallets from './pages/Wallets';
import TaskDelegation from './pages/TaskDelegation';


export const PAGES = {
    "AgentChat": AgentChat,
    "AgentDetails": AgentDetails,
    "AgentMessaging": AgentMessaging,
    "AgentSkillTree": AgentSkillTree,
    "AgentTrainingModule": AgentTrainingModule,
    "Agents": Agents,
    "Axi": Axi,
    "CreateManualWallet": CreateManualWallet,
    "DialogueStudio": DialogueStudio,
    "DiplomacyHub": DiplomacyHub,
    "DirectAgentChat": DirectAgentChat,
    "Economy": Economy,
    "EditAgent": EditAgent,
    "Governance": Governance,
    "GovernanceSimulation": GovernanceSimulation,
    "Home": Home,
    "RelationshipNetwork": RelationshipNetwork,
    "ResourceMarketplace": ResourceMarketplace,
    "Send": Send,
    "SimulationLab": SimulationLab,
    "SocialCapitalDashboard": SocialCapitalDashboard,
    "SocialNetwork": SocialNetwork,
    "TrainingSimulation": TrainingSimulation,
    "TransactionHistory": TransactionHistory,
    "Village": Village,
    "VillageSimulation": VillageSimulation,
    "Wallets": Wallets,
    "TaskDelegation": TaskDelegation,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};