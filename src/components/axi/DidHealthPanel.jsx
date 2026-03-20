import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Fingerprint, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  healthy:  { color: 'text-green-400',  bg: 'bg-green-900/20',  badge: 'bg-green-600',  label: 'Healthy' },
  warning:  { color: 'text-amber-400',  bg: 'bg-amber-900/20',  badge: 'bg-amber-500',  label: 'Warning' },
  degraded: { color: 'text-orange-400', bg: 'bg-orange-900/20', badge: 'bg-orange-600', label: 'Degraded' },
  critical: { color: 'text-red-400',    bg: 'bg-red-900/20',    badge: 'bg-red-600',    label: 'Critical' },
};

function evaluateWalletHealth(wallet, agents, credentials, didVersions, auditLogs) {
  const checks = [];
  const did = wallet.classic_address ? `did:xrpl:${wallet.classic_address}` : null;

  checks.push({ id: 'anchored',    status: wallet.classic_address ? 'pass' : 'fail' });
  checks.push({ id: 'not_revoked', status: wallet.notes?.includes('REVOKED') ? 'fail' : 'pass' });
  checks.push({ id: 'did_doc',     status: didVersions.find(v => v.wallet_id === wallet.id && v.is_active) ? 'pass' : 'warn' });

  const linkedAgent = agents.find(a => a.wallet_id === wallet.id);
  checks.push({ id: 'agent', status: linkedAgent ? 'pass' : 'warn' });

  if (linkedAgent) {
    checks.push({ id: 'agent_active', status: linkedAgent.status === 'active' ? 'pass' : linkedAgent.status === 'dormant' ? 'warn' : 'fail' });
  }

  const hasCredentials = credentials.some(c => c.status === 'active' && (c.subject_wallet_id === wallet.id || c.issuer_wallet_id === wallet.id));
  checks.push({ id: 'credentials', status: hasCredentials ? 'pass' : 'warn' });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hasRecentAudit = auditLogs.some(l => l.wallet_id === wallet.id && new Date(l.created_date) > thirtyDaysAgo);
  checks.push({ id: 'audit', status: hasRecentAudit ? 'pass' : 'warn' });

  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned  = checks.filter(c => c.status === 'warn').length;
  const score   = Math.round((passed / checks.length) * 100);

  let overall = 'healthy';
  if (failed > 0) overall = 'critical';
  else if (warned >= 3) overall = 'degraded';
  else if (warned > 0) overall = 'warning';

  return { score, overall, passed, failed, warned, linkedAgent, did };
}

export default function DidHealthPanel() {
  const opts = { staleTime: 30000, refetchInterval: 30000 };

  const { data: wallets    = [], isLoading: lw } = useQuery({ queryKey: ['dp-wallets'],   queryFn: () => base44.entities.Wallet.list(),             ...opts });
  const { data: agents     = [], isLoading: la } = useQuery({ queryKey: ['dp-agents'],    queryFn: () => base44.entities.Agent.list(),              ...opts });
  const { data: credentials= [], isLoading: lc } = useQuery({ queryKey: ['dp-creds'],     queryFn: () => base44.entities.DidCredential.list(),      ...opts });
  const { data: didVersions= [], isLoading: lv } = useQuery({ queryKey: ['dp-versions'],  queryFn: () => base44.entities.DidDocumentVersion.list(), ...opts });
  const { data: auditLogs  = [], isLoading: lal}= useQuery({ queryKey: ['dp-audit'],     queryFn: () => base44.entities.DidAuditLog.list(),        ...opts });

  const loading = lw || la || lc || lv || lal;

  const didWallets = wallets.filter(w => w.classic_address);
  const healthReports = didWallets.map(w => ({
    wallet: w,
    ...evaluateWalletHealth(w, agents, credentials, didVersions, auditLogs),
  }));

  const total   = healthReports.length;
  const healthy = healthReports.filter(r => r.overall === 'healthy').length;
  const warning = healthReports.filter(r => r.overall === 'warning').length;
  const degraded= healthReports.filter(r => r.overall === 'degraded').length;
  const critical= healthReports.filter(r => r.overall === 'critical').length;
  const avgScore= total > 0 ? Math.round(healthReports.reduce((s, r) => s + r.score, 0) / total) : 0;
  const overallStatus = critical > 0 ? 'critical' : degraded > 0 ? 'degraded' : warning > 0 ? 'warning' : 'healthy';
  const cfg = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallStatus === 'healthy' ? CheckCircle : overallStatus === 'critical' ? XCircle : AlertTriangle;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-indigo-400" />
          DID Health Network
        </h3>
        <Link to="/DIDHealthDashboard">
          <Button size="sm" variant="ghost" className="text-indigo-300 hover:text-white text-xs h-7">
            Full Dashboard →
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading DID health data...
        </div>
      ) : total === 0 ? (
        <div className="text-sm text-slate-400 py-2">No DIDs found — create a wallet with a classic address to start monitoring.</div>
      ) : (
        <>
          {/* Overall Health */}
          <div className={`rounded-lg p-3 border border-white/10 ${cfg.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <OverallIcon className={`w-5 h-5 ${cfg.color}`} />
                <span className="text-sm font-semibold text-white capitalize">{cfg.label}</span>
              </div>
              <div className={`text-2xl font-bold ${cfg.color}`}>{avgScore}%</div>
            </div>
            <Progress value={avgScore} className="h-1 bg-white/10 mt-2" />
            <div className="text-xs text-slate-400 mt-1">{total} DID{total !== 1 ? 's' : ''} monitored</div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-900/20 rounded-lg p-2 border border-green-500/20">
              <div className="text-xs text-slate-400">Healthy</div>
              <div className="text-lg font-bold text-green-400">{healthy}</div>
            </div>
            <div className="bg-amber-900/20 rounded-lg p-2 border border-amber-500/20">
              <div className="text-xs text-slate-400">Warning</div>
              <div className="text-lg font-bold text-amber-400">{warning}</div>
            </div>
            <div className="bg-orange-900/20 rounded-lg p-2 border border-orange-500/20">
              <div className="text-xs text-slate-400">Degraded</div>
              <div className="text-lg font-bold text-orange-400">{degraded}</div>
            </div>
            <div className="bg-red-900/20 rounded-lg p-2 border border-red-500/20">
              <div className="text-xs text-slate-400">Critical</div>
              <div className="text-lg font-bold text-red-400">{critical}</div>
            </div>
          </div>

          {/* Individual DID list */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-semibold">Individual DIDs</div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {healthReports.map(({ wallet, overall, score, linkedAgent }, idx) => {
                const c = STATUS_CONFIG[overall];
                return (
                  <div key={idx} className={`rounded-lg p-2 border border-white/5 ${c.bg} text-xs`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.color.replace('text-', 'bg-')}`} />
                        <span className="text-slate-300 truncate">
                          {linkedAgent ? linkedAgent.name : (wallet.name || 'Unlinked DID')}
                        </span>
                      </div>
                      <Badge className={`${c.badge} text-white border-0 text-[10px] shrink-0`}>
                        {score}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}