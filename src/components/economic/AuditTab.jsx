import React from 'react';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import { resolveAgentName, isRealHash } from '@/lib/economicUtils';

const TYPE_MAP = {
  earned:              'transaction',
  spent:               'transaction',
  traded:              'transaction',
  treasury_deposit:    'governance',
  treasury_withdrawal: 'governance',
  resource_acquired:   'task',
  resource_sold:       'task',
};

export default function AuditTab({ activities = [], agents = [] }) {
  const events = activities.slice(0, 100).map(a => {
    const label = (a.activity_type || 'unknown').replace(/_/g, ' ').toUpperCase();
    const agentName = resolveAgentName(a.agent_id, agents);
    const relatedName = a.related_agent_id ? resolveAgentName(a.related_agent_id, agents) : null;
    const hash = a.transaction_hash;
    const hasRealHash = isRealHash(hash);

    return {
      id: a.id,
      type: TYPE_MAP[a.activity_type] || 'info',
      title: `${label}: ${a.amount ?? 0} XRP`,
      description: a.description || 'No description',
      actor: agentName,
      timestamp: a.created_date,
      tx_hash: hasRealHash ? hash : null,
      details: {
        activity_type: a.activity_type,
        status: a.status,
        agent: agentName,
        ...(relatedName ? { related_agent: relatedName } : {}),
        ...(hasRealHash ? { tx_hash: hash } : {}),
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