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
import Agents from './pages/Agents';
import Axi from './pages/Axi';
import CreateManualWallet from './pages/CreateManualWallet';
import DirectAgentChat from './pages/DirectAgentChat';
import Economy from './pages/Economy';
import EditAgent from './pages/EditAgent';
import Governance from './pages/Governance';
import Home from './pages/Home';
import Send from './pages/Send';
import TransactionHistory from './pages/TransactionHistory';
import Village from './pages/Village';
import Wallets from './pages/Wallets';
import AgentTrainingModule from './pages/AgentTrainingModule';


export const PAGES = {
    "AgentChat": AgentChat,
    "AgentDetails": AgentDetails,
    "Agents": Agents,
    "Axi": Axi,
    "CreateManualWallet": CreateManualWallet,
    "DirectAgentChat": DirectAgentChat,
    "Economy": Economy,
    "EditAgent": EditAgent,
    "Governance": Governance,
    "Home": Home,
    "Send": Send,
    "TransactionHistory": TransactionHistory,
    "Village": Village,
    "Wallets": Wallets,
    "AgentTrainingModule": AgentTrainingModule,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};