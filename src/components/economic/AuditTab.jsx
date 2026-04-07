import React from 'react';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import { format, parseISO } from 'date-fns';

// Map EconomicActivity types to ActivityTimeline event types
const TYPE_MAP = {
  earned: 'transaction',
  spent: 'transaction',
  traded: 'transaction',
  treasury_deposit: 'governance',
  treasury_withdrawal: 'governance',
  resource_acquired: 'task',
  resource_sold: 'task',
};

function resolveAgentName(agentId, agents) {
  if (!agentId) return 'Unknown';
  const byId = agents.find(a => a.id === agentId);
  if (byId) return byId.name;
  const byAddress = agents.find(a => a.classic_address === agentId);
  if (byAddress) return byAddress.name;
  const byWallet = agents.find(a => a.wallet_id === agentId);
  if (byWallet) return byWallet.name;
  if (agentId === 'dex_swap') return 'DEX Swap Engine';
  if (agentId === 'rAXI') return 'Axi';
  if (agentId.startsWith('r') && agentId.length > 20) return `${agentId.slice(0, 6)}…${agentId.slice(-4)}`;
  return agentId.length > 12 ? `${agentId.slice(0, 10)}…` : agentId;
}

export default function AuditTab({ activities = [], agents = [] }) {
  const events = activities.slice(0, 100).map(a => {
    const label = (a.activity_type || 'unknown').replace(/_/g, ' ').toUpperCase();
    const agentName = resolveAgentName(a.agent_id, agents);
    const relatedName = a.related_agent_id ? resolveAgentName(a.related_agent_id, agents) : null;

    return {
      id: a.id,
      type: TYPE_MAP[a.activity_type] || 'info',
      title: `${label}: ${a.amount ?? 0} XRP`,
      description: a.description || 'No description',
      actor: agentName,
      timestamp: a.created_date,
      details: {
        activity_type: a.activity_type,
        status: a.status,
        agent: agentName,
        ...(relatedName ? { related_agent: relatedName } : {}),
        ...(a.transaction_hash ? { tx_hash: a.transaction_hash } : {}),
        ...(a.resource_id ? { resource_id: a.resource_id } : {}),
      },
    };
  });

  return (
    <ActivityTimeline
      events={events}
      title="Economic Activity Audit Trail"
      maxHeight="650px"
    />
  );
}