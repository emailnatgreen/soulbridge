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

export default function AuditTab({ activities = [], agents = [], transactions = [] }) {
  // Map EconomicActivity records
  const activityEvents = activities.slice(0, 100).map(a => {
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

  // Map Transaction records (these have real XRPL hashes)
  const txEvents = transactions
    .filter(t => t.status === 'completed')
    .slice(0, 100)
    .map(t => {
      const hash = t.hash;
      const hasRealHash = isRealHash(hash);
      const recipientName = t.recipient_name || t.recipient_address || 'Unknown';

      return {
        id: `tx-${t.id}`,
        type: 'transaction',
        title: `XRPL PAYMENT: ${t.amount ?? 0} XRP`,
        description: t.note || `Payment to ${recipientName}`,
        actor: recipientName,
        timestamp: t.created_date,
        tx_hash: hasRealHash ? hash : null,
        details: {
          status: t.status,
          recipient: recipientName,
          recipient_address: t.recipient_address,
          amount: `${t.amount} XRP`,
          ...(hasRealHash ? { tx_hash: hash } : {}),
          ...(t.note ? { note: t.note } : {}),
        },
      };
    });

  // Merge and sort by timestamp descending
  const allEvents = [...activityEvents, ...txEvents].sort((a, b) => {
    try {
      return new Date(b.timestamp) - new Date(a.timestamp);
    } catch {
      return 0;
    }
  });

  return (
    <ActivityTimeline
      events={allEvents}
      title="Economic Activity Audit Trail"
      maxHeight="650px"
    />
  );
}