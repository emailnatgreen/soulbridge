import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Play, Loader2, Filter, AlertTriangle, CheckCircle2, XCircle, Clock, Database } from 'lucide-react';
import BiasReportCard from './BiasReportCard';
import BiasReviewDialog from './BiasReviewDialog';

const FILTER_OPTIONS = {
  status: ['all', 'pending', 'reviewed', 'corrected', 'dismissed'],
  severity: ['all', 'critical', 'high', 'medium', 'low'],
  source: ['all', 'tripwire', 'compressed_attention', 'lore', 'leaf_6'],
};

export default function BiasDetectionPanel() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', severity: 'all', source: 'all' });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDecision, setReviewDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch existing bias reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['bias-reports'],
    queryFn: () => base44.entities.BiasReport.list('-created_date', 100),
  });

  // Run bias scan
  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await base44.functions.invoke('detectBias', { action: 'scan' });
      setScanResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['bias-reports'] });
    } catch (e) {
      setScanResult({ error: e.message });
    }
    setScanning(false);
  };

  // Review a bias report
  const handleReviewStart = (report, decision) => {
    setReviewTarget(report);
    setReviewDecision(decision);
  };

  const handleReviewConfirm = async (notes) => {
    if (!reviewTarget || !reviewDecision) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke('detectBias', {
        action: 'review',
        report_id: reviewTarget.id,
        decision: reviewDecision,
        notes,
      });
      queryClient.invalidateQueries({ queryKey: ['bias-reports'] });
      setReviewTarget(null);
      setReviewDecision(null);
    } catch (e) {
      console.error('Review failed:', e);
    }
    setSubmitting(false);
  };

  // Filter reports
  const filtered = reports.filter(r => {
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.severity !== 'all' && r.severity !== filters.severity) return false;
    if (filters.source !== 'all' && r.source !== filters.source) return false;
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const criticalCount = reports.filter(r => r.severity === 'critical' && r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Eye className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Leaf 1: Bias Detection
              <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[9px]">LIVE</Badge>
              {pendingCount > 0 && (
                <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[9px]">
                  {pendingCount} pending
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="bg-red-500/15 text-red-300 border-red-500/30 text-[9px]">
                  {criticalCount} critical
                </Badge>
              )}
            </h3>
            <p className="text-white/50 text-xs">Immune system of the deep meaning layer — detects systematic biases, not random errors</p>
          </div>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Analyses Tripwire events, Compressed Attention (Node 8) scores, and Lore/Memory patterns to identify 
          systematic biases in security scoring, honour distribution, skill growth, and node behaviour. 
          Every detection is logged immutably to the Sovereign Archive via Memory.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleScan}
          disabled={scanning}
          className="bg-red-600 hover:bg-red-500 text-white gap-2 text-sm"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? 'Scanning…' : 'Run Bias Scan'}
        </Button>
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
              className="bg-black/30 border border-white/10 text-white/70 text-[10px] rounded-md px-2 py-1 focus:outline-none"
            >
              {options.map(o => (
                <option key={o} value={o}>{key}: {o}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && !scanResult.error && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="text-xs text-white/70">
            Scan complete — <span className="text-green-300 font-semibold">{scanResult.biases_found} biases</span> detected
            ({scanResult.breakdown?.tripwire || 0} tripwire, {scanResult.breakdown?.compressed_attention || 0} attention, {scanResult.breakdown?.lore || 0} lore)
            in {scanResult.processing_ms}ms.
            Data: {scanResult.data_analysed?.tripwire_events || 0} events, {scanResult.data_analysed?.agents || 0} agents, {scanResult.data_analysed?.skills || 0} skills.
          </div>
        </div>
      )}
      {scanResult?.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">Scan error: {scanResult.error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Reports', value: reports.length, icon: Database, color: 'text-white/60' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-yellow-300' },
          { label: 'Corrected', value: reports.filter(r => r.status === 'corrected').length, icon: CheckCircle2, color: 'text-green-300' },
          { label: 'Dismissed', value: reports.filter(r => r.status === 'dismissed').length, icon: XCircle, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-white/30 text-[9px]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <Eye className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">
            {reports.length === 0 ? 'No bias reports yet — run a scan to begin.' : 'No reports match current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <BiasReportCard
              key={report.id}
              report={report}
              onReview={handleReviewStart}
            />
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {reviewTarget && (
        <BiasReviewDialog
          report={reviewTarget}
          decision={reviewDecision}
          onConfirm={handleReviewConfirm}
          onCancel={() => { setReviewTarget(null); setReviewDecision(null); }}
          submitting={submitting}
        />
      )}
    </div>
  );
}