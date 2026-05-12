import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, ShieldOff, Clock, Loader2 } from 'lucide-react';

const ICONS = { allow: ShieldCheck, flag: AlertTriangle, block: ShieldOff };
const COLORS = { allow: 'text-emerald-400', flag: 'text-amber-400', block: 'text-red-400' };

export default function ReportHistoryList({ reports, selectedId, onSelect }) {
  if (!reports || reports.length === 0) {
    return <p className="text-white/20 text-xs text-center py-4">No reports yet — ask a question to begin.</p>;
  }

  return (
    <div className="space-y-1">
      {reports.map(r => {
        const decision = r.leaf5_policy?.decision;
        const Icon = ICONS[decision] || Clock;
        const color = COLORS[decision] || 'text-white/30';
        const isSelected = selectedId === r.id;

        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
              isSelected ? 'bg-white/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-start gap-2">
              {r.status === 'processing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 mt-0.5" />
              ) : (
                <Icon className={`w-3.5 h-3.5 mt-0.5 ${color}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs truncate">{r.question}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.leaf5_policy?.overall_veracity != null && (
                    <span className={`text-[10px] font-mono ${color}`}>
                      {Math.round(r.leaf5_policy.overall_veracity * 100)}%
                    </span>
                  )}
                  <span className="text-white/20 text-[10px]">
                    {r.leaf1_claims?.length || 0} claims
                  </span>
                  {r.processing_ms && (
                    <span className="text-white/20 text-[10px]">{(r.processing_ms/1000).toFixed(1)}s</span>
                  )}
                  {r.report_hash && (
                    <span className="text-cyan-400/30 text-[9px] font-mono">#{r.report_hash.slice(0, 8)}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}