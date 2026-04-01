const pageModules = import.meta.glob('../pages/**/*.{js,jsx}', { eager: true });

const MANUAL_STATUS_MAP = {
  AIProjectHub: { status: 'partial', notes: 'Good query usage, but still has page-specific manual refresh logic.' },
  Home: { status: 'partial', notes: 'Mix of React Query and manual useEffect loading; likely not fully live-safe.' },
  Agents: { status: 'good', notes: 'Uses shared query keys and query loading cleanly.' },
  AgentMessaging: { status: 'risky', notes: 'Uses older route helper and heavy polling patterns.' },
  GovernanceHub: { status: 'partial', notes: 'Good queries and mutations, but some one-off auth/loading logic remains.' },
  ProjectManager: { status: 'good', notes: 'Strong query-based loading with shared keys.' },
  VillageCalendar: { status: 'good', notes: 'Query-driven and easy to refresh globally.' },
  Wallets: { status: 'risky', notes: 'Uses older route helper and mixed direct create/query patterns.' },
  SovereignID: { status: 'risky', notes: 'Manual loadData flow instead of shared query patterns.' },
  KineticGridDashboard: { status: 'good', notes: 'Mostly query-driven with regular refresh.' },
  MemoryBrowser: { status: 'good', notes: 'Query-driven and easy to keep in sync.' },
  ImageStorage: { status: 'good', notes: 'Query-driven with proper invalidation after changes.' },
  ServiceSkillMarketplace: { status: 'partial', notes: 'Uses refetch callbacks instead of broader shared invalidation.' },
  AgentWellbeing: { status: 'partial', notes: 'Mostly query-driven, but older route helper remains.' },
  Economy: { status: 'partial', notes: 'Live polling exists, but mixed manual auth setup remains.' },
  Admin: { status: 'good', notes: 'Good subscription plus invalidation model.' },
  AxiCommandDashboard: { status: 'good', notes: 'Can force global query refresh cleanly.' },
  RiskRegister: { status: 'good', notes: 'Simple query/invalidation flow.' },
  SkillsHub: { status: 'good', notes: 'Mostly standard query usage.' },
  MentorshipHub: { status: 'partial', notes: 'Good query usage but manual identity bootstrap remains.' },
  SystemDashboard: { status: 'good', notes: 'Heavily query-driven with polling.' },
  TreasuryDashboard: { status: 'partial', notes: 'Query-driven but still mixes manual identity setup and old route helper.' },
  Notifications: { status: 'good', notes: 'Good subscription + query invalidation.' },
  Village: { status: 'partial', notes: 'Query-driven but uses older route helper and user-id assumptions.' },
  CollaborationHub: { status: 'partial', notes: 'Good queries, but uses older route helper and weaker shared sync patterns.' },
};

const formatPageName = (filePath) => {
  const fileName = filePath.split('/').pop()?.replace(/\.(js|jsx)$/, '') || 'Unknown';
  return fileName;
};

export function getSyncAuditRows() {
  return Object.keys(pageModules)
    .map((filePath) => {
      const page = formatPageName(filePath);
      const manual = MANUAL_STATUS_MAP[page];

      return {
        page,
        status: manual?.status || 'partial',
        notes: manual?.notes || 'Auto-discovered page. Detailed sync audit notes have not been written yet.'
      };
    })
    .sort((a, b) => a.page.localeCompare(b.page));
}