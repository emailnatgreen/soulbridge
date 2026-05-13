import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import LeafShell from './LeafShell';

export default function LeafSynthesis({ leaf, data }) {
  if (!data || (typeof data === 'object' && !data.summary)) return <LeafShell leaf={leaf} />;

  // Handle both string (v1) and object (v2) formats
  const isV2 = typeof data === 'object';
  const summary = isV2 ? data.summary : data;
  const phaseMapping = isV2 ? (data.phase_mapping || []) : [];
  const visRec = isV2 ? data.visibility_recommendation : null;
  const visReason = isV2 ? data.visibility_reason : null;
  const confidence = isV2 ? data.confidence_score : null;

  return (
    <LeafShell leaf={leaf}>
      <div className="space-y-3">
        {/* Summary */}
        <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{summary}</p>

        {/* Confidence */}
        {confidence !== null && confidence !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Confidence:</span>
            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${confidence >= 70 ? 'bg-emerald-500' : confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(confidence, 100)}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${confidence >= 70 ? 'text-emerald-400' : confidence >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{confidence}%</span>
          </div>
        )}

        {/* Phase Mapping */}
        {phaseMapping.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">Phase Mapping</p>
            {phaseMapping.map((phase, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="text-[9px] bg-pink-500/15 text-pink-300 border-pink-500/25">Phase {phase.phase}</Badge>
                  <span className="text-white/60 text-xs font-medium">{phase.phase_name}</span>
                </div>
                {phase.actions?.map((action, j) => (
                  <div key={j} className="flex items-center gap-1.5 pl-4 text-[10px]">
                    <ArrowRight className="w-2.5 h-2.5 text-white/15" />
                    <span className="text-white/45">{action}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Visibility Recommendation */}
        {visRec && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[10px]">
            {visRec.toLowerCase() === 'private' ? (
              <EyeOff className="w-3.5 h-3.5 text-white/30" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-white/40">Visibility rec: <span className="font-semibold text-white/60">{visRec}</span></span>
            {visReason && <span className="text-white/25">— {visReason}</span>}
          </div>
        )}
      </div>
    </LeafShell>
  );
}