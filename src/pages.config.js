/**
 * pages.config.js - LEGACY routing config (RETAINED for backward compatibility only)
 * 
 * All active routing is handled by explicit <Route> declarations in App.jsx.
 * This file only contains pages that still exist in the codebase.
 * Orphaned pages were purged on 2026-05-14 via Codebase Hygiene Scan.
 */
import { lazy } from 'react';

const LazyLayout = lazy(() => import('./Layout.jsx'));

const PAGES = {
  "AgentChat": lazy(() => import('./pages/AgentChat')),
  "AgentLeaderboard": lazy(() => import('./pages/AgentLeaderboard')),
  "AgentMarketplace": lazy(() => import('./pages/AgentMarketplace')),
  "AgentOrchestration": lazy(() => import('./pages/AgentOrchestration')),
  "AgentPerformanceAnalytics": lazy(() => import('./pages/AgentPerformanceAnalytics')),
  "AgentProfile": lazy(() => import('./pages/AgentProfile')),
  "AgentRolePermissions": lazy(() => import('./pages/AgentRolePermissions')),
  "AgentSkillTree": lazy(() => import('./pages/AgentSkillTree')),
  "AgentTrainingModule": lazy(() => import('./pages/AgentTrainingModule')),
  "AgentWellbeing": lazy(() => import('./pages/AgentWellbeing')),
  "Agents": lazy(() => import('./pages/Agents')),
  "Axi": lazy(() => import('./pages/Axi')),
  "AxiIntelligenceFeed": lazy(() => import('./pages/AxiIntelligenceFeed')),
  "DIDManager": lazy(() => import('./pages/DIDManager')),
  "EconomicDashboard": lazy(() => import('./pages/EconomicDashboard')),
  "EditAgentProfile": lazy(() => import('./pages/EditAgentProfile')),
  "EditLanding": lazy(() => import('./pages/EditLanding')),
  "Home": lazy(() => import('./pages/Home')),
  "ImageStorage": lazy(() => import('./pages/ImageStorage')),
  "MentorshipHub": lazy(() => import('./pages/MentorshipHub')),
  "Send": lazy(() => import('./pages/Send')),
  "SimulationLab": lazy(() => import('./pages/SimulationLab')),
  "SkillDevelopment": lazy(() => import('./pages/SkillDevelopment')),
  "Support": lazy(() => import('./pages/Support')),
  "Terms": lazy(() => import('./pages/Terms')),
  "Wallets": lazy(() => import('./pages/Wallets')),
};

export { PAGES };

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: LazyLayout,
};