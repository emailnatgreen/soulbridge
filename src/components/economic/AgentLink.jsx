import React from 'react';
import { Link } from 'react-router-dom';
import { resolveAgentName, findAgentId } from '@/lib/economicUtils';

export default function AgentLink({ agentId, agents = [], className = '' }) {
  const name = resolveAgentName(agentId, agents);
  const resolvedId = findAgentId(agentId, agents);

  if (!resolvedId) {
    return <span className={`text-slate-300 ${className}`}>{name}</span>;
  }

  return (
    <Link
      to={`/agents/${resolvedId}`}
      className={`text-slate-200 hover:text-emerald-400 transition-colors underline decoration-slate-600 hover:decoration-emerald-400 underline-offset-2 ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {name}
    </Link>
  );
}