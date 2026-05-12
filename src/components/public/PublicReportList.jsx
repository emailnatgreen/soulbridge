import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

const DECISION_STYLES = {
  allow: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'VERIFIED' },
  flag: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'FLAGGED' },
  block: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'BLOCKED' },
};

export default function PublicReportList({ reports, selectedId, onSelect }) {
  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-white/30 text-sm">No verified reports yet.</p>
        <p className="text-white/15 text-xs mt-1">Reports appear here once the 7-Leaf pipeline completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map(report => {
        const isSelected = report.id === selectedId;
        const decision = report.policy?.decision || 'flag';
        const style = DECISION_STYLES[decision] || DECISION_STYLES.flag;
        const avgPct = report.veracity_summary?.avg_score != null
          ? Math.round(report.veracity_summary.avg_score * 100)
          : '?';
        const date = report.created_at ? format(new Date(report.created_at), 'MMM d, yyyy') : '';

        return (
          <button
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              isSelected
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
            }`}
          >
            <p className="text-white/80 text-sm font-medium leading-snug line-clamp-2 mb-2">
              {report.question}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] border ${style.bg} ${style.text}`}>{style.label}</Badge>
                <span className="text-white/40 font-mono text-xs">{avgPct}%</span>
              </div>
              <div className="flex items-center gap-1 text-white/20 text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {date}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}