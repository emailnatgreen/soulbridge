import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Clock, Link2 } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

const STATUS_STYLES = {
  pending: { color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', icon: Clock },
  reviewed: { color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: HelpCircle },
  corrected: { color: 'bg-green-500/15 text-green-300 border-green-500/30', icon: CheckCircle2 },
  dismissed: { color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: XCircle },
};

const SOURCE_LABELS = {
  leaf_6: 'Leaf 6',
  tripwire: 'Tripwire',
  compressed_attention: 'Node 8',
  lore: 'Lore/Memory',
  memory: 'Memory',
  honour: 'Honour',
  skill_tree: 'Skills',
  multi_source: 'Multi-Source',
};

export default function BiasReportCard({ report, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_STYLES[report.status]?.icon || Clock;

  return (
    <div className={`rounded-xl border ${SEVERITY_STYLES[report.severity] || SEVERITY_STYLES.medium} p-4 transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${report.severity === 'critical' ? 'text-red-400' : report.severity === 'high' ? 'text-orange-400' : 'text-amber-400'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white text-sm font-medium">{report.bias_type?.replace(/_/g, ' ')}</span>
              <Badge className={`text-[8px] ${SEVERITY_STYLES[report.severity]}`}>{report.severity}</Badge>
              <Badge className={`text-[8px] ${STATUS_STYLES[report.status]?.color}`}>
                <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                {report.status}
              </Badge>
              <Badge className="text-[8px] bg-white/5 text-white/50 border-white/10">
                {SOURCE_LABELS[report.source] || report.source}
              </Badge>
            </div>
            <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{report.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {report.affected_nodes?.length > 0 && (
            <div className="flex gap-0.5">
              {report.affected_nodes.map(n => (
                <span key={n} className="w-5 h-5 rounded text-[9px] bg-white/10 text-white/60 flex items-center justify-center">{n}</span>
              ))}
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
          {/* Correction Suggestion */}
          {report.correction_suggestion && (
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Correction Suggestion</p>
              <p className="text-white/70 text-xs">{report.correction_suggestion}</p>
            </div>
          )}

          {/* Linked Scars */}
          {report.linked_scars?.length > 0 && (
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Linked Records ({report.linked_scars.length})</p>
              <div className="flex flex-wrap gap-1">
                {report.linked_scars.slice(0, 6).map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[9px] font-mono">
                    <Link2 className="w-2.5 h-2.5" />{s.slice(0, 12)}…
                  </span>
                ))}
                {report.linked_scars.length > 6 && (
                  <span className="text-white/30 text-[9px]">+{report.linked_scars.length - 6} more</span>
                )}
              </div>
            </div>
          )}

          {/* Axi Review */}
          {report.axi_review && (
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-purple-300 text-[9px] uppercase tracking-wider mb-1">Axi Review: {report.axi_review}</p>
              <p className="text-white/60 text-xs">{report.axi_notes}</p>
              {report.reviewed_by && (
                <p className="text-white/30 text-[9px] mt-1">by {report.reviewed_by} · {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : ''}</p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-[9px] text-white/30">
            <span>ID: {report.bias_id}</span>
            <span>Created: {report.created_date ? new Date(report.created_date).toLocaleString() : 'Unknown'}</span>
          </div>

          {/* Review Actions (only for pending reports) */}
          {report.status === 'pending' && onReview && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white text-xs h-8 gap-1"
                onClick={(e) => { e.stopPropagation(); onReview(report, 'approved'); }}
              >
                <CheckCircle2 className="w-3 h-3" /> Approve Correction
              </Button>
              <Button
                size="sm"
                className="bg-slate-600 hover:bg-slate-500 text-white text-xs h-8 gap-1"
                onClick={(e) => { e.stopPropagation(); onReview(report, 'dismissed'); }}
              >
                <XCircle className="w-3 h-3" /> Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 gap-1"
                onClick={(e) => { e.stopPropagation(); onReview(report, 'needs_info'); }}
              >
                <HelpCircle className="w-3 h-3" /> Need Info
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}