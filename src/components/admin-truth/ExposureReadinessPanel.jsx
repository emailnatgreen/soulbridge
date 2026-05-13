import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldOff, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { getReadinessBadgeState } from '@/lib/exposureReadinessEngine';

const STATE_STYLES = {
  ready:   { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: ShieldCheck, color: 'text-emerald-400', label: 'Exposure Ready' },
  waiver:  { border: 'border-amber-500/20', bg: 'bg-amber-500/5', icon: ShieldAlert, color: 'text-amber-400', label: 'Waiver Required' },
  blocked: { border: 'border-red-500/20', bg: 'bg-red-500/5', icon: ShieldOff, color: 'text-red-400', label: 'Not Ready for Exposure' },
};

function CriterionRow({ passed, label, detail }) {
  return (
    <div className="flex items-start gap-2 text-[10px]">
      {passed
        ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
        : <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
      }
      <div>
        <span className={passed ? 'text-white/50' : 'text-white/70'}>{label}</span>
        {detail && <p className="text-white/30 text-[9px] mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function WeightBar({ distribution }) {
  const total = (distribution.critical || 0) + (distribution.high || 0) + (distribution.medium || 0) + (distribution.low || 0);
  if (total === 0) return <span className="text-white/20 text-[9px]">No weighted items</span>;

  const pct = (n) => Math.round((n / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
        {distribution.critical > 0 && <div className="bg-red-500" style={{ width: `${pct(distribution.critical)}%` }} />}
        {distribution.high > 0 && <div className="bg-amber-500" style={{ width: `${pct(distribution.high)}%` }} />}
        {distribution.medium > 0 && <div className="bg-blue-500" style={{ width: `${pct(distribution.medium)}%` }} />}
        {distribution.low > 0 && <div className="bg-emerald-500" style={{ width: `${pct(distribution.low)}%` }} />}
      </div>
      <div className="flex gap-3 text-[8px]">
        {distribution.critical > 0 && <span className="text-red-400">{distribution.critical} critical</span>}
        {distribution.high > 0 && <span className="text-amber-400">{distribution.high} high</span>}
        {distribution.medium > 0 && <span className="text-blue-400">{distribution.medium} med</span>}
        {distribution.low > 0 && <span className="text-emerald-400">{distribution.low} low</span>}
      </div>
    </div>
  );
}

export default function ExposureReadinessPanel({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const state = getReadinessBadgeState(result);
  const style = STATE_STYLES[state];
  const Icon = style.icon;

  const ps = result.phase_status || {};
  const rs = result.risk_summary || {};
  const cs = result.contradiction_summary || {};

  return (
    <Card className={`${style.bg} ${style.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-violet-400">Exposure Readiness Engine</span>
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300/60 border-violet-500/20">DETERMINISTIC</Badge>
          <div className="ml-auto flex items-center gap-2">
            <div className={`flex items-center gap-1 ${style.color}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">{style.label}</span>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white/60">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Blocking reasons summary */}
        {result.blocking_reasons.length > 0 && (
          <div className="space-y-1">
            {result.blocking_reasons.map((br, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-red-400/80">
                <ShieldOff className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                <span>{br.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Waiver reasons */}
        {result.waiver_required && result.waiver_reasons.length > 0 && (
          <div className="space-y-1">
            {result.waiver_reasons.map((wr, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-amber-400/80">
                <ShieldAlert className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                <span>{wr.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ready confirmation */}
        {result.exposure_ready && !result.waiver_required && (
          <div className="flex items-center gap-2 text-[10px] text-emerald-400/80">
            <ShieldCheck className="w-3 h-3" />
            <span>All five criteria passed — safe to expose</span>
          </div>
        )}

        {/* Recommended visibility */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-white/30">Leaf 7 recommends:</span>
          <Badge className={`text-[8px] ${result.recommended_visibility === 'public' ? 'bg-emerald-500/15 text-emerald-300' : result.recommended_visibility === 'internal' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-white/40'}`}>
            {result.recommended_visibility}
          </Badge>
        </div>

        {/* Expandable breakdown */}
        {expanded && (
          <div className="border-t border-white/5 pt-3 space-y-3">
            {/* Criterion 1: Phase 1 */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">1. Phase 1 Completion</p>
              <CriterionRow
                passed={ps.state === 'complete' || ps.state === 'waived' || ps.state === 'no_phase_1'}
                label={ps.state === 'no_phase_1' ? 'No Phase 1 steps' : ps.state === 'complete' ? 'All Phase 1 steps done' : ps.state === 'waived' ? `Phase 1 complete (${ps.waived} waived)` : `${ps.pending} of ${ps.total} steps still pending`}
                detail={ps.total > 0 ? `Done: ${ps.done} · Waived: ${ps.waived} · Pending: ${ps.pending}` : null}
              />
            </div>

            {/* Criterion 2: Critical risks */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2. Critical Risks</p>
              <CriterionRow
                passed={rs.critical === 0}
                label={rs.critical === 0 ? 'No unaddressed critical risks' : `${rs.critical} critical risk${rs.critical !== 1 ? 's' : ''} unaddressed`}
                detail={`Total: ${rs.total} · High: ${rs.high} · Medium: ${rs.medium} · Low: ${rs.low}`}
              />
            </div>

            {/* Criterion 3: Contradictions */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">3. Contradictions</p>
              <CriterionRow
                passed={cs.integrity_flags === 0}
                label={cs.integrity_flags === 0 ? 'No integrity flags' : `${cs.integrity_flags} integrity flag${cs.integrity_flags !== 1 ? 's' : ''} present`}
                detail={`${cs.total} total contradiction${cs.total !== 1 ? 's' : ''}`}
              />
            </div>

            {/* Criterion 4: Weight distribution */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">4. Weight Stability</p>
              <CriterionRow
                passed={result.weight_distribution.critical === 0}
                label={result.weight_distribution.critical === 0 ? 'Weight distribution stable' : `${result.weight_distribution.critical} critical-weight items remain`}
              />
              <WeightBar distribution={result.weight_distribution} />
            </div>

            {/* Criterion 5: Visibility rec */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">5. Leaf 7 Recommendation</p>
              <CriterionRow
                passed={result.recommended_visibility !== 'private'}
                label={result.recommended_visibility === 'private' ? 'Leaf 7 recommends private — waiver required to expose' : `Leaf 7 recommends "${result.recommended_visibility}"`}
              />
            </div>

            {/* Audit count */}
            <p className="text-white/15 text-[9px]">{result.audit_entries} visibility audit entries recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}