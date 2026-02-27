import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, Fingerprint, CheckCircle, AlertTriangle, XCircle,
  ArrowLeft, RefreshCw, Activity, Clock, FileText, Users,
  Award, Lock, TrendingUp, Wifi, WifiOff, Loader2, Search, Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import DidEventStream from '../components/DidEventStream';

// ── Health check logic ────────────────────────────────────
function evaluateWalletHealth(wallet, agents, credentials, didVersions, auditLogs) {
  const checks = [];
  const did = wallet.classic_address ? `did:xrpl:${wallet.classic_address}` : null;

  // 1. Has classic address (anchored)
  checks.push({
    id: 'anchored',
    label: 'On-Chain Address',
    status: wallet.classic_address ? 'pass' : 'fail',
    detail: wallet.classic_address ? wallet.classic_address : 'No classic address set',
  });

  // 2. Not revoked
  const revoked = wallet.notes?.includes('REVOKED');
  checks.push({
    id: 'not_revoked',
    label: 'Not Revoked',
    status: revoked ? 'fail' : 'pass',
    detail: revoked ? 'DID has been revoked' : 'Active on ledger',
  });

  // 3. Has active DID Document version
  const activeDoc = didVersions.find(v => v.wallet_id === wallet.id && v.is_active);
  checks.push({
    id: 'did_doc',
    label: 'DID Document Published',
    status: activeDoc ? 'pass' : 'warn',
    detail: activeDoc ? `v${activeDoc.version_number} active` : 'No active DID Document version',
  });

  // 4. Has linked agent
  const linkedAgent = agents.find(a => a.wallet_id === wallet.id);
  checks.push({
    id: 'agent',
    label: 'Agent Linked',
    status: linkedAgent ? 'pass' : 'warn',
    detail: linkedAgent ? linkedAgent.name : 'No agent linked to this DID',
  });

  // 5. Agent is active
  if (linkedAgent) {
    checks.push({
      id: 'agent_active',
      label: 'Agent Operational',
      status: linkedAgent.status === 'active' ? 'pass' : linkedAgent.status === 'dormant' ? 'warn' : 'fail',
      detail: linkedAgent.status || 'unknown',
    });
  }

  // 6. Has credentials
  const didCredentials = credentials.filter(
    c => c.status === 'active' && (c.subject_wallet_id === wallet.id || c.issuer_wallet_id === wallet.id)
  );
  checks.push({
    id: 'credentials',
    label: 'Credentials Issued',
    status: didCredentials.length > 0 ? 'pass' : 'warn',
    detail: didCredentials.length > 0 ? `${didCredentials.length} active credential(s)` : 'No credentials issued',
  });

  // 7. Recent audit activity (within 30 days)
  const recentLogs = auditLogs.filter(l => {
    if (l.wallet_id !== wallet.id) return false;
    const created = new Date(l.created_date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return created > thirtyDaysAgo;
  });
  checks.push({
    id: 'audit',
    label: 'Recent Audit Activity',
    status: recentLogs.length > 0 ? 'pass' : 'warn',
    detail: recentLogs.length > 0 ? `${recentLogs.length} events in last 30 days` : 'No recent audit events',
  });

  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const score = Math.round((passed / checks.length) * 100);

  let overall = 'healthy';
  if (failed > 0) overall = 'critical';
  else if (warned >= 3) overall = 'degraded';
  else if (warned > 0) overall = 'warning';

  return { checks, score, overall, passed, failed, warned, linkedAgent, did };
}

const STATUS_CONFIG = {
  healthy:  { color: 'text-green-400',  bg: 'bg-green-900/20 border-green-500/30',  badge: 'bg-green-600',   label: 'Healthy',  icon: CheckCircle },
  warning:  { color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-500/30',  badge: 'bg-amber-500',   label: 'Warning',  icon: AlertTriangle },
  degraded: { color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/30',badge: 'bg-orange-600',  label: 'Degraded', icon: AlertTriangle },
  critical: { color: 'text-red-400',    bg: 'bg-red-900/20 border-red-500/30',      badge: 'bg-red-600',     label: 'Critical', icon: XCircle },
};

const CHECK_ICONS = {
  pass: <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
};

export default function DIDHealthDashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // ── DID Resolver state ─────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [resolvedData, setResolvedData] = useState(null);

  const resolveMutation = useMutation({
    mutationFn: (did) => base44.functions.invoke('resolveDID', { did }),
    onSuccess: (response) => {
      setResolvedData(response.data);
      toast.success('DID resolved successfully');
    },
    onError: (error) => {
      const errorData = error.response?.data;
      setResolvedData({ error: true, ...errorData });
      toast.error(errorData?.error || 'Failed to resolve DID');
    }
  });

  const handleSearch = () => {
    if (!searchInput.trim()) { toast.error('Please enter a DID'); return; }
    setResolvedData(null);
    resolveMutation.mutate(searchInput.trim());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const queryOptions = (key, fn) => ({
    queryKey: [key],
    queryFn: fn,
    staleTime: 30000,
  });

  const { data: wallets = [], refetch: refetchWallets } = useQuery(queryOptions('dh-wallets', () => base44.entities.Wallet.list()));
  const { data: agents = [], refetch: refetchAgents } = useQuery(queryOptions('dh-agents', () => base44.entities.Agent.list()));
  const { data: credentials = [], refetch: refetchCreds } = useQuery(queryOptions('dh-creds', () => base44.entities.DidCredential.list()));
  const { data: didVersions = [], refetch: refetchVersions } = useQuery(queryOptions('dh-versions', () => base44.entities.DidDocumentVersion.list()));
  const { data: auditLogs = [], refetch: refetchAudit } = useQuery(queryOptions('dh-audit', () => base44.entities.DidAuditLog.list()));

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallets(), refetchAgents(), refetchCreds(), refetchVersions(), refetchAudit()]);
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  // Only evaluate wallets that have a classic_address (real DIDs)
  const didWallets = wallets.filter(w => w.classic_address);
  const healthReports = didWallets.map(w => ({
    wallet: w,
    ...evaluateWalletHealth(w, agents, credentials, didVersions, auditLogs),
  }));

  // Summary stats
  const total = healthReports.length;
  const healthy = healthReports.filter(r => r.overall === 'healthy').length;
  const warning = healthReports.filter(r => r.overall === 'warning').length;
  const degraded = healthReports.filter(r => r.overall === 'degraded').length;
  const critical = healthReports.filter(r => r.overall === 'critical').length;
  const avgScore = total > 0 ? Math.round(healthReports.reduce((sum, r) => sum + r.score, 0) / total) : 0;
  const overallStatus = critical > 0 ? 'critical' : degraded > 0 ? 'degraded' : warning > 0 ? 'warning' : 'healthy';
  const OverallIcon = STATUS_CONFIG[overallStatus].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('DIDManager')}>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> DID Manager
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-sm">DID Health Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            Last refresh: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
          <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white h-8 text-xs" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* DID Resolution Search */}
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Search className="w-4 h-4 text-indigo-400" />
            DID Resolution Search
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="did:xrpl:rXXXXXXXXXXXXXXXXXXXXXXX..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-slate-900/60 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-500"
            />
            <Button
              onClick={handleSearch}
              disabled={resolveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              {resolveMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              <span className="ml-1 hidden sm:inline">{resolveMutation.isPending ? 'Resolving…' : 'Resolve'}</span>
            </Button>
          </div>

          {/* Resolution Results */}
          {resolvedData && (
            resolvedData.error ? (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-300 text-sm">Resolution Failed</div>
                  <div className="text-red-400/80 text-xs mt-1">
                    {resolvedData.didResolutionMetadata?.message || resolvedData.error || 'Unknown error'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  DID Resolved Successfully
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {resolvedData.didResolutionMetadata?.retrieved && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-white/40 mb-1">Retrieved</div>
                      <div className="text-white/80 font-mono">{new Date(resolvedData.didResolutionMetadata.retrieved).toLocaleString()}</div>
                    </div>
                  )}
                  {resolvedData.didResolutionMetadata?.contentType && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-white/40 mb-1">Content Type</div>
                      <div className="text-white/80 font-mono break-all">{resolvedData.didResolutionMetadata.contentType}</div>
                    </div>
                  )}
                  {resolvedData.didDocumentMetadata?.network && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-white/40 mb-1">Network</div>
                      <Badge className="bg-indigo-600 text-white border-0 text-xs">{resolvedData.didDocumentMetadata.network}</Badge>
                    </div>
                  )}
                  {resolvedData.didDocumentMetadata?.version !== undefined && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-white/40 mb-1">Version</div>
                      <div className="text-white/80">v{resolvedData.didDocumentMetadata.version}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50">DID Document</span>
                    <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-6 text-xs px-2"
                      onClick={() => copyToClipboard(JSON.stringify(resolvedData.didDocument, null, 2))}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-green-300 p-4 rounded-lg text-xs overflow-x-auto max-h-64 font-mono">
                    {JSON.stringify(resolvedData.didDocument, null, 2)}
                  </pre>
                </div>
                {resolvedData.didDocumentMetadata?.note && (
                  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 text-xs text-indigo-300">
                    ℹ️ {resolvedData.didDocumentMetadata.note}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Overall Health Banner */}
        <div className={`border rounded-xl p-5 flex items-center justify-between ${STATUS_CONFIG[overallStatus].bg}`}>
          <div className="flex items-center gap-4">
            <OverallIcon className={`w-8 h-8 ${STATUS_CONFIG[overallStatus].color}`} />
            <div>
              <div className="text-lg font-bold">Village DID Network: {STATUS_CONFIG[overallStatus].label}</div>
              <div className="text-white/50 text-sm">{total} DID{total !== 1 ? 's' : ''} monitored · Average health score: {avgScore}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${STATUS_CONFIG[overallStatus].color}`}>{avgScore}%</div>
            <div className="text-xs text-white/40 mt-1">Network Health</div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total DIDs', value: total, color: 'text-white', bg: 'bg-slate-800/60' },
            { label: 'Healthy', value: healthy, color: 'text-green-400', bg: 'bg-green-900/20 border-green-500/20' },
            { label: 'Warning', value: warning, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-500/20' },
            { label: 'Degraded', value: degraded, color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/20' },
            { label: 'Critical', value: critical, color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg} border-white/10`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Individual DID Cards */}
        {total === 0 ? (
          <div className="bg-slate-800/40 border border-white/10 rounded-xl p-12 text-center">
            <Fingerprint className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No DIDs found. Create a DID to start monitoring.</p>
            <Link to={createPageUrl('CreateDID')} className="mt-4 inline-block">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 mt-3">Create DID</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {healthReports.map(({ wallet, checks, score, overall, passed, failed, warned, linkedAgent, did }) => {
              const cfg = STATUS_CONFIG[overall];
              const StatusIcon = cfg.icon;
              return (
                <div key={wallet.id} className={`border rounded-xl p-5 space-y-4 ${cfg.bg}`}>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Fingerprint className={`w-5 h-5 shrink-0 ${cfg.color}`} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {linkedAgent ? `${linkedAgent.name}'s DID` : (wallet.name || 'Unnamed DID')}
                        </div>
                        <code className="text-xs text-white/30 truncate block">
                          {did || 'No address'}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge className={`${cfg.badge} text-white border-0 text-xs`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Health Score Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/50">Health Score</span>
                      <span className={`text-sm font-bold ${cfg.color}`}>{score}%</span>
                    </div>
                    <Progress value={score} className="h-1.5 bg-white/10" />
                    <div className="flex gap-3 mt-2 text-xs text-white/40">
                      <span className="text-green-400">{passed} pass</span>
                      {warned > 0 && <span className="text-amber-400">{warned} warn</span>}
                      {failed > 0 && <span className="text-red-400">{failed} fail</span>}
                    </div>
                  </div>

                  {/* Check Items */}
                  <div className="space-y-2">
                    {checks.map(check => (
                      <div key={check.id} className="flex items-center gap-2 text-xs">
                        {CHECK_ICONS[check.status]}
                        <span className="text-white/70 w-36 shrink-0">{check.label}</span>
                        <span className="text-white/40 truncate">{check.detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div className="text-xs text-white/30">
                      {wallet.network?.toUpperCase()} · Created {formatDistanceToNow(new Date(wallet.created_date), { addSuffix: true })}
                    </div>
                    <Link to={createPageUrl('DIDManager')}>
                      <Button size="sm" variant="ghost" className="text-white/50 hover:text-white h-7 text-xs px-2">
                        Manage →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Health Check Legend</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-white/50">
            <div><span className="text-green-400 font-bold">Healthy</span> — All checks pass (≤0 warns)</div>
            <div><span className="text-amber-400 font-bold">Warning</span> — 1–2 warnings, no failures</div>
            <div><span className="text-orange-400 font-bold">Degraded</span> — 3+ warnings, no failures</div>
            <div><span className="text-red-400 font-bold">Critical</span> — At least 1 check failed</div>
          </div>
        </div>

      </div>
    </div>
  );
}