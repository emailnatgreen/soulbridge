import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { usePageSignal } from '@/hooks/usePageSignal';

const auditRows = [
  { page: 'AIProjectHub', status: 'partial', notes: 'Good query usage, but still has page-specific manual refresh logic.' },
  { page: 'Home', status: 'partial', notes: 'Mix of React Query and manual useEffect loading; likely not fully live-safe.' },
  { page: 'Agents', status: 'good', notes: 'Uses shared query keys and query loading cleanly.' },
  { page: 'AgentMessaging', status: 'risky', notes: 'Uses older route helper and heavy polling patterns.' },
  { page: 'GovernanceHub', status: 'partial', notes: 'Good queries and mutations, but some one-off auth/loading logic remains.' },
  { page: 'ProjectManager', status: 'good', notes: 'Strong query-based loading with shared keys.' },
  { page: 'VillageCalendar', status: 'good', notes: 'Query-driven and easy to refresh globally.' },
  { page: 'Wallets', status: 'risky', notes: 'Uses older route helper and mixed direct create/query patterns.' },
  { page: 'SovereignID', status: 'risky', notes: 'Manual loadData flow instead of shared query patterns.' },
  { page: 'KineticGridDashboard', status: 'good', notes: 'Mostly query-driven with regular refresh.' },
  { page: 'MemoryBrowser', status: 'good', notes: 'Query-driven and easy to keep in sync.' },
  { page: 'ImageStorage', status: 'good', notes: 'Query-driven with proper invalidation after changes.' },
  { page: 'ServiceSkillMarketplace', status: 'partial', notes: 'Uses refetch callbacks instead of broader shared invalidation.' },
  { page: 'AgentWellbeing', status: 'partial', notes: 'Mostly query-driven, but older route helper remains.' },
  { page: 'Economy', status: 'partial', notes: 'Live polling exists, but mixed manual auth setup remains.' },
  { page: 'Admin', status: 'good', notes: 'Good subscription plus invalidation model.' },
  { page: 'AxiCommandDashboard', status: 'good', notes: 'Can force global query refresh cleanly.' },
  { page: 'RiskRegister', status: 'good', notes: 'Simple query/invalidation flow.' },
  { page: 'SkillsHub', status: 'good', notes: 'Mostly standard query usage.' },
  { page: 'MentorshipHub', status: 'partial', notes: 'Good query usage but manual identity bootstrap remains.' },
  { page: 'SystemDashboard', status: 'good', notes: 'Heavily query-driven with polling.' },
  { page: 'TreasuryDashboard', status: 'partial', notes: 'Query-driven but still mixes manual identity setup and old route helper.' },
  { page: 'Notifications', status: 'good', notes: 'Good subscription + query invalidation.' },
  { page: 'Village', status: 'partial', notes: 'Query-driven but uses older route helper and user-id assumptions.' },
  { page: 'CollaborationHub', status: 'partial', notes: 'Good queries, but uses older route helper and weaker shared sync patterns.' },
];

const statusConfig = {
  good: { label: 'Healthy', className: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2 },
  partial: { label: 'Partial', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
  risky: { label: 'Needs work', className: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
};

export default function SyncAuditReport() {
  usePageSignal();

  const totals = {
    good: auditRows.filter(r => r.status === 'good').length,
    partial: auditRows.filter(r => r.status === 'partial').length,
    risky: auditRows.filter(r => r.status === 'risky').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/AIProjectHub">
              <Button variant="ghost" className="text-white/70 hover:text-white px-0 mb-3">
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold">Platform Sync Audit</h1>
            <p className="text-white/50 mt-1">A first-pass view of which pages are in sync and which still need work.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10"><CardContent className="p-5"><div className="text-sm text-white/50">Healthy pages</div><div className="text-3xl font-bold text-green-300 mt-1">{totals.good}</div></CardContent></Card>
          <Card className="bg-white/5 border-white/10"><CardContent className="p-5"><div className="text-sm text-white/50">Partial pages</div><div className="text-3xl font-bold text-amber-300 mt-1">{totals.partial}</div></CardContent></Card>
          <Card className="bg-white/5 border-white/10"><CardContent className="p-5"><div className="text-sm text-white/50">Need work</div><div className="text-3xl font-bold text-red-300 mt-1">{totals.risky}</div></CardContent></Card>
        </div>

        <FeedbackWidget pageName="SyncAuditReport" />

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Page-by-page status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditRows.map((row) => {
              const config = statusConfig[row.status];
              const Icon = config.icon;
              return (
                <div key={row.page} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium text-white">{row.page}</div>
                    <div className="text-sm text-white/55 mt-1">{row.notes}</div>
                  </div>
                  <Badge className={config.className}>
                    <Icon className="w-3.5 h-3.5 mr-1" />{config.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}