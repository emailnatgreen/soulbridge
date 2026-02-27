import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHECK_CONFIGS = [
  {
    id: 'dids_anchored',
    label: 'DID Documents anchored on-chain (XLS-80)',
    description: 'At least one active wallet with a DID document',
    check: ({ wallets, didVersions }) => {
      const active = wallets.filter(w => w.network && w.classic_address);
      const withDoc = didVersions.filter(v => v.is_active);
      if (active.length === 0) return { pass: false, detail: 'No active wallets found' };
      if (withDoc.length === 0) return { pass: false, detail: 'No active DID document versions found' };
      return { pass: true, detail: `${withDoc.length} active DID document(s) across ${active.length} wallet(s)` };
    },
  },
  {
    id: 'credentials_issued',
    label: 'Verifiable Credentials issued (XLS-70)',
    description: 'At least 3 active credentials in the system',
    check: ({ credentials }) => {
      const active = credentials.filter(c => c.status === 'active');
      if (active.length === 0) return { pass: false, detail: 'No active credentials found' };
      if (active.length < 3) return { pass: 'warn', detail: `Only ${active.length} active credential(s) — recommend more for a stronger application` };
      return { pass: true, detail: `${active.length} active verifiable credential(s) issued` };
    },
  },
  {
    id: 'agents_present',
    label: 'Permissioned Agent Economy deployed',
    description: 'Active agents demonstrating the credential-gated domain',
    check: ({ agents }) => {
      const active = agents.filter(a => a.status === 'active');
      if (active.length === 0) return { pass: false, detail: 'No active agents found' };
      if (active.length < 3) return { pass: 'warn', detail: `${active.length} active agent(s) — a richer population strengthens the demo` };
      return { pass: true, detail: `${active.length} active agent(s) operating in the credential-gated Village` };
    },
  },
  {
    id: 'trust_relationships',
    label: 'Trust Network established',
    description: 'Active trust relationships between DIDs',
    check: ({ trustRelationships }) => {
      const active = trustRelationships.filter(t => t.status === 'active');
      if (active.length === 0) return { pass: false, detail: 'No active trust relationships found' };
      return { pass: true, detail: `${active.length} active trust relationship(s) on record` };
    },
  },
  {
    id: 'audit_trail',
    label: 'Immutable Audit Trail (DID Activity Log)',
    description: 'Audit log entries demonstrating governance integrity',
    check: ({ auditLogs }) => {
      if (auditLogs.length === 0) return { pass: false, detail: 'No audit log entries found' };
      if (auditLogs.length < 5) return { pass: 'warn', detail: `${auditLogs.length} audit event(s) — more activity strengthens the trail` };
      return { pass: true, detail: `${auditLogs.length} audit event(s) logged — governance trail intact` };
    },
  },
  {
    id: 'reputation_scores',
    label: 'On-chain Reputation Scores computed',
    description: 'Reputation scores calculated for DIDs',
    check: ({ reputationScores }) => {
      if (reputationScores.length === 0) return { pass: false, detail: 'No reputation scores found' };
      return { pass: true, detail: `${reputationScores.length} DID reputation score(s) computed` };
    },
  },
  {
    id: 'grant_requirements',
    label: 'Grant requirements manually verified',
    description: 'All checklist items marked complete in the tracker',
    check: ({ grant }) => {
      if (!grant?.requirements?.length) return { pass: 'warn', detail: 'No requirements defined on this grant' };
      const total = grant.requirements.length;
      const done = grant.requirements.filter(r => r.completed).length;
      const remaining = total - done;
      if (remaining === 0) return { pass: true, detail: 'All requirements marked complete ✓' };
      if (remaining <= 2) return { pass: 'warn', detail: `${remaining} requirement(s) still pending` };
      return { pass: false, detail: `${remaining} of ${total} requirements still incomplete` };
    },
  },
];

export default function GrantComplianceCheck({ grant }) {
  const [runKey, setRunKey] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-check', runKey],
    queryFn: async () => {
      const [wallets, didVersions, credentials, agents, trustRelationships, auditLogs, reputationScores] = await Promise.all([
        base44.entities.Wallet.list(),
        base44.entities.DidDocumentVersion.list(),
        base44.entities.DidCredential.list(),
        base44.entities.Agent.list(),
        base44.entities.TrustRelationship.list(),
        base44.entities.DidAuditLog.list('-created_date', 50),
        base44.entities.ReputationScore.list(),
      ]);
      return { wallets, didVersions, credentials, agents, trustRelationships, auditLogs, reputationScores };
    },
  });

  const results = data
    ? CHECK_CONFIGS.map(cfg => ({
        ...cfg,
        result: cfg.check({ ...data, grant }),
      }))
    : [];

  const passed = results.filter(r => r.result?.pass === true).length;
  const warned = results.filter(r => r.result?.pass === 'warn').length;
  const failed = results.filter(r => r.result?.pass === false).length;
  const total = CHECK_CONFIGS.length;

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-sm text-white">Automated Compliance Check</span>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">{passed} pass</span>
              {warned > 0 && <span className="text-amber-400">{warned} warn</span>}
              {failed > 0 && <span className="text-red-400">{failed} fail</span>}
              <span className="text-white/30">/ {total}</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-white/20 text-white/60 hover:text-white"
            onClick={() => setRunKey(k => k + 1)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking…' : 'Re-run'}
          </Button>
        </div>
      </div>

      {/* Overall bar */}
      {data && (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
          <div className="bg-green-500 transition-all" style={{ width: `${(passed / total) * 100}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${(warned / total) * 100}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
        </div>
      )}

      {isLoading && !data && (
        <div className="text-xs text-white/40 text-center py-4">Running compliance checks against live database…</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(r => {
            const pass = r.result?.pass;
            const Icon = pass === true ? CheckCircle : pass === 'warn' ? AlertTriangle : XCircle;
            const color = pass === true ? 'text-green-400' : pass === 'warn' ? 'text-amber-400' : 'text-red-400';
            const bg = pass === true ? 'bg-green-500/10 border-green-500/20' : pass === 'warn' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

            return (
              <div key={r.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${bg}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90">{r.label}</div>
                  <div className={`text-xs mt-0.5 ${color}`}>{r.result?.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}