import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { usePageSignal } from '@/hooks/usePageSignal';
import { getSyncAuditRows } from '@/lib/syncAuditPages';

const statusConfig = {
  good: { label: 'Healthy', className: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2 },
  partial: { label: 'Partial', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
  risky: { label: 'Needs work', className: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertTriangle },
};

export default function SyncAuditReport() {
  usePageSignal();

  const auditRows = getSyncAuditRows();

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
            <p className="text-white/50 mt-1">An automatic view of all app pages, with known sync notes preserved where they already existed.</p>
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
            <CardTitle>Page-by-page status ({auditRows.length} total)</CardTitle>
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