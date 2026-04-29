import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const BREADCRUMB_MAP = {
  '/home': { label: 'Home', parent: null },
  '/dashboard': { label: 'Dashboard', parent: '/home' },
  '/agents': { label: 'Village Agents', parent: '/home' },
  '/my-agents': { label: 'My Agent Hub', parent: '/agents' },
  '/agent-genesis': { label: 'Agent Genesis', parent: '/agents' },
  '/AgentChat': { label: 'Agent Chat', parent: '/agents' },
  '/training': { label: 'Skill Development', parent: '/agents' },
  '/SkillDevelopment': { label: 'Skill Development', parent: '/agents' },
  '/AgentTrainingModule': { label: 'Training', parent: '/agents' },
  '/agents/edit': { label: 'Edit Profile', parent: '/agents' },
  '/EditAgentProfile': { label: 'Edit Profile', parent: '/agents' },
  '/AgentWellbeing': { label: 'Wellbeing', parent: '/agents' },
  '/leaderboard': { label: 'Leaderboard', parent: '/agents' },
  '/AgentLeaderboard': { label: 'Leaderboard', parent: '/agents' },
  '/SkillValidation': { label: 'Skill Validation', parent: '/agents' },
  '/AgentSkillTree': { label: 'Skill Tree', parent: '/agents' },
  '/governance': { label: 'Governance', parent: '/home' },
  '/GovernanceHub': { label: 'Governance', parent: '/home' },
  '/GovernanceVotingDashboard': { label: 'Voting', parent: '/governance' },
  '/NewProposalDraft': { label: 'New Proposal', parent: '/governance' },
  '/TreasuryAllocationProposal': { label: 'Treasury Proposals', parent: '/governance' },
  '/wallets': { label: 'Wallets', parent: '/home' },
  '/Wallets': { label: 'Wallets', parent: '/home' },
  '/sovereign-id': { label: 'Sovereign ID', parent: '/home' },
  '/SovereignID': { label: 'Sovereign ID', parent: '/home' },
  '/did-manager': { label: 'DID Manager', parent: '/sovereign-id' },
  '/DIDManager': { label: 'DID Manager', parent: '/sovereign-id' },
  '/skills': { label: 'Skills Hub', parent: '/home' },
  '/SkillsHub': { label: 'Skills Hub', parent: '/home' },
  '/marketplace': { label: 'Marketplace', parent: '/home' },
  '/ServiceSkillMarketplace': { label: 'Marketplace', parent: '/home' },
  '/calendar': { label: 'Calendar', parent: '/home' },
  '/VillageCalendar': { label: 'Calendar', parent: '/home' },
  '/memory-browser': { label: 'Memory Browser', parent: '/home' },
  '/MemoryBrowser': { label: 'Memory Browser', parent: '/home' },
  '/MentorshipHub': { label: 'Mentorship', parent: '/agents' },
  '/mentorship': { label: 'Mentorship', parent: '/agents' },
  '/widget-marketplace': { label: 'Widget Marketplace', parent: '/home' },
  '/nft-workshop': { label: 'NFT Workshop', parent: '/home' },
  '/storefront': { label: 'Storefront', parent: '/home' },
  '/send': { label: 'Send', parent: '/wallets' },
  '/Send': { label: 'Send', parent: '/wallets' },
};

function buildChain(pathname) {
  const chain = [];
  let current = pathname;

  // Handle dynamic agent profile routes like /agents/abc123
  if (current.startsWith('/agents/') && current !== '/agents/edit') {
    chain.unshift({ label: 'Agent Profile', path: current });
    current = '/agents';
  }

  while (current) {
    const entry = BREADCRUMB_MAP[current];
    if (entry) {
      chain.unshift({ label: entry.label, path: current });
      current = entry.parent;
    } else {
      break;
    }
  }

  // Always prepend Home if not already there
  if (chain.length === 0 || chain[0].path !== '/home') {
    chain.unshift({ label: 'Home', path: '/home' });
  }

  return chain;
}

export default function PageBreadcrumb({ className = '' }) {
  const location = useLocation();
  const chain = buildChain(location.pathname);

  if (chain.length <= 1) return null;

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      {chain.map((crumb, idx) => {
        const isLast = idx === chain.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />}
            {isLast ? (
              <span className="text-white/80 font-medium truncate">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-white/40 hover:text-white/70 transition truncate"
              >
                {idx === 0 ? <Home className="w-3.5 h-3.5" /> : crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}