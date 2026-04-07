import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveAgentName, findAgentId } from '@/lib/economicUtils';

function truncateDID(address) {
  if (!address || address.length < 12) return null;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function AgentLink({ agentId, agents = [], className = '', showDID = true }) {
  const name = resolveAgentName(agentId, agents);
  const resolvedId = findAgentId(agentId, agents);
  const agent = resolvedId ? agents.find(a => a.id === resolvedId) : null;
  const did = agent?.classic_address;
  const truncated = showDID ? truncateDID(did) : null;

  if (!resolvedId) {
    return <span className={`text-slate-300 ${className}`}>{name}</span>;
  }

  const linkContent = (
    <Link
      to={`/agents/${resolvedId}`}
      className={`inline-flex items-center gap-1.5 text-slate-200 hover:text-emerald-400 transition-colors underline decoration-slate-600 hover:decoration-emerald-400 underline-offset-2 ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {name}
      {truncated && (
        <span className="text-[9px] font-mono text-slate-500 no-underline">({truncated})</span>
      )}
    </Link>
  );

  if (!did) return linkContent;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-800 border-slate-700 text-slate-200 text-xs font-mono px-3 py-1.5">
          DID: {did}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}