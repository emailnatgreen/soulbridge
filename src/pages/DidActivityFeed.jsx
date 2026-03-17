import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Activity, Link as LinkIcon, Key, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import FilterBar from '@/components/filters/FilterBar';

const DID_FILTERS = [
  { key: 'eventType', label: 'Event Type', type: 'select', options: ['credential_issued','credential_updated','did_created','message_sent','endorsement','audit','permission_change'] },
  { key: 'dateRange', label: 'Date', type: 'daterange' },
];

export default function DidActivityFeed() {
  const [filterValues, setFilterValues] = useState({ search: '', eventType: 'all', dateRange: {} });

  const { data: credentials = [] } = useQuery({
    queryKey: ['did-creds-feed'],
    queryFn: () => base44.entities.DidCredential.list('-created_date', 100),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['did-audit-logs'],
    queryFn: () => base44.entities.DidAuditLog.list('-created_date', 100),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['did-messages-feed'],
    queryFn: () => base44.entities.DidMessage.list('-created_date', 50),
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['did-endorsements'],
    queryFn: () => base44.entities.DidEndorsement.list('-created_date', 50),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['did-versions'],
    queryFn: () => base44.entities.DidDocumentVersion.list('-created_date', 50),
  });

  // Build unified event list
  const allEvents = [
    ...credentials.map(c => ({
      id: c.id, type: 'info',
      title: `Credential: ${c.credential_type?.replace(/_/g, ' ') || 'Unknown Type'}`,
      description: `Status: ${c.status} · Subject: ${c.subject_did?.slice(0, 20)}…`,
      actor: c.issuer_did?.slice(0, 16) || 'Unknown',
      timestamp: c.created_date,
      details: { type: 'credential_issued', subject: c.subject_did, issuer: c.issuer_did },
    })),
    ...auditLogs.map(l => ({
      id: l.id, type: l.action?.includes('fail') ? 'error' : 'system',
      title: `Audit: ${l.action?.replace(/_/g, ' ') || 'DID Action'}`,
      description: l.details || l.result || '',
      actor: l.actor_did?.slice(0, 16) || 'System',
      timestamp: l.created_date,
    })),
    ...messages.map(m => ({
      id: m.id, type: 'info',
      title: `DID Message: ${m.message_type || 'text'}`,
      description: (m.content || m.encrypted_content || '').slice(0, 100),
      actor: m.sender_did?.slice(0, 16) || 'Unknown',
      timestamp: m.created_date,
    })),
    ...endorsements.map(e => ({
      id: e.id, type: 'reputation',
      title: `Endorsement: ${e.endorsement_type || 'peer'}`,
      description: e.claim || e.notes || '',
      actor: e.endorser_did?.slice(0, 16) || 'Unknown',
      timestamp: e.created_date,
    })),
    ...versions.map(v => ({
      id: v.id, type: 'system',
      title: `DID Document v${v.version || '?'} Updated`,
      description: v.change_summary || v.notes || 'Document version change',
      actor: v.did_id?.slice(0, 16) || 'Unknown',
      timestamp: v.created_date,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply filters
  const filtered = allEvents.filter(e => {
    const q = filterValues.search?.toLowerCase();
    if (q && !`${e.title} ${e.description} ${e.actor}`.toLowerCase().includes(q)) return false;
    if (filterValues.dateRange?.from && new Date(e.timestamp) < new Date(filterValues.dateRange.from)) return false;
    if (filterValues.dateRange?.to && new Date(e.timestamp) > new Date(filterValues.dateRange.to)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />DID Activity Feed
          </h1>
          <p className="text-slate-400 text-sm mt-1">{allEvents.length} total DID events</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Credentials', val: credentials.length, color: 'text-blue-400' },
            { label: 'Audit Logs', val: auditLogs.length, color: 'text-amber-400' },
            { label: 'Messages', val: messages.length, color: 'text-pink-400' },
            { label: 'Endorsements', val: endorsements.length, color: 'text-green-400' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <FilterBar
          filters={DID_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search DID events, actors, content…"
          resultCount={filtered.length}
        />

        <ActivityTimeline
          events={filtered}
          title="DID Activity Audit Trail"
          showFilters={false}
          maxHeight="700px"
        />
      </div>
    </div>
  );
}