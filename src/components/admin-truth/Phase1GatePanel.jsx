import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, FileWarning, Scale, ShieldOff } from 'lucide-react';
import { getGateBadgeState } from '@/lib/phase1CompletionGate';

const STATE_STYLES = {
  open:       { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: Unlock,        color: 'text-emerald-400', label: 'Phase 1 Gate: OPEN' },
  overridden: { border: 'border-amber-500/20',   bg: 'bg-amber-500/5',   icon: AlertTriangle, color: 'text-amber-400',   label: 'Phase 1 Gate: OVERRIDDEN' },
  closed:     { border: 'border-red-500/20',      bg: 'bg-red-500/5',     icon: Lock,          color: 'text-red-400',     label: 'Phase 1 Gate: LOCKED' },
};

function CriterionBlock({ passed, label, detail, items }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2 text-[10px]">
        {passed
          ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
          : <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
        }
        <div className="flex-1">
          <span className={passed ? 'text-white/50' : 'text-white/70 font-medium'}>{label}</span>
          {detail && <p className="text-white/30 text-[9px] mt-0.5">{detail}</p>}
        </div>
      </div>
      {items && items.length > 0 && (
        <div className="ml-5 space-y-0.5">
          {items.slice(0, 5).map((item, i) => (
            <p key={i} className="text-red-400/60 text-[9px]">• {typeof item === 'string' ? item : item.message}</p>
          ))}
          {items.length > 5 && <p className="text-white/20 text-[9px]">+ {items.length - 5} more</p>}
        </div>
      )}
    </div>
  );
}

function WeightMiniBar({ distribution }) {
  const total = (distribution.critical || 0) + (distribution.high || 0) + (distribution.medium || 0) + (distribution.low || 0);
  if (total === 0) return <span className="text-white/20 text-[9px]">No weighted items</span>;
  const pct = (n) => Math.max(Math.round((n / total) * 100), n > 0 ? 2 : 0);
  return (
    <div className="ml-5 space-y-1">
      <div className="flex h-1 rounded-full overflow-hidden bg-white/5">
        {distribution.critical > 0 && <div className="bg-red-500" style={{ width: `${pct(distribution.critical)}%` }} />}
        {distribution.high > 0 && <div className="bg-amber-500" style={{ width: `${pct(distribution.high)}%` }} />}
        {distribution.medium > 0 && <div className="bg-blue-500" style={{ width: `${pct(distribution.medium)}%` }} />}
        {distribution.low > 0 && <div className="bg-emerald-500" style={{ width: `${pct(distribution.low)}%` }} />}
      </div>
      <div className="flex gap-2 text-[8px]">
        {distribution.critical > 0 && <span className="text-red-400">{distribution.critical} crit</span>}
        {distribution.high > 0 && <span className="text-amber-400">{distribution.high} high</span>}
        {distribution.medium > 0 && <span className="text-blue-400">{distribution.medium} med</span>}
        {distribution.low > 0 && <span className="text-emerald-400">{distribution.low} low</span>}
      </div>
    </div>
  );
}

export default function Phase1GatePanel({ result, onRequestWaiver }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const state = getGateBadgeState(result);
  const style = STATE_STYLES[state];
  const Icon = style.icon;

  const ps = result.phase1_summary || {};
  const bs = result.blocker_summary || {};
  const rs = result.risk_summary || {};
  const cs = result.contradiction_summary || {};
  const ws = result.weight_summary || {};

  const blocksByPhase1 = result.blocking_items.filter(b => b.criterion === 'phase1_steps');
  const blocksByBlocker = result.blocking_items.filter(b => b.criterion === 'publish_blockers');
  const blocksByRisk = result.blocking_items.filter(b => b.criterion === 'critical_risks');
  const blocksByContradiction = result.blocking_items.filter(b => b.criterion === 'contradictions');
  const blocksByWeight = result.blocking_items.filter(b => b.criterion === 'weight_stability');

  return (
    <Card className={`${style.bg} ${style.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400">Phase‑1 Completion Gate</span>
          <Badge className="text-[7px] bg-red-500/10 text-red-300/60 border-red-500/20">HARD LOCK</Badge>
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
        {/* Summary line */}
        {state === 'open' && (
          <div className="flex items-center gap-2 text-[10px] text-emerald-400/80">
            <Unlock className="w-3 h-3" />
            <span>All 5 hard criteria passed — gate open, system structurally sound</span>
          </div>
        )}
        {state === 'overridden' && (
          <div className="flex items-center gap-2 text-[10px] text-amber-400/80">
            <AlertTriangle className="w-3 h-3" />
            <span>Gate open via {result.waiver_log.length} waiver{result.waiver_log.length !== 1 ? 's' : ''} — structural integrity not fully confirmed</span>
          </div>
        )}
        {state === 'closed' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-red-400/80">
              <ShieldOff className="w-3 h-3" />
              <span>{result.blocking_items.length} blocker{result.blocking_items.length !== 1 ? 's' : ''} prevent exposure</span>
            </div>
            {onRequestWaiver && (
              <Button onClick={onRequestWaiver} variant="ghost" size="sm" className="text-red-400 text-[9px] h-5 px-2 hover:text-red-300 hover:bg-red-500/10">
                <FileWarning className="w-3 h-3 mr-1" />
                Request Waiver
              </Button>
            )}
          </div>
        )}

        {/* Waiver log (amber state) */}
        {state === 'overridden' && result.waiver_log.length > 0 && (
          <div className="space-y-1 border-t border-amber-500/10 pt-2">
            <p className="text-amber-400/50 text-[9px] uppercase tracking-wider font-semibold">Active Waivers</p>
            {result.waiver_log.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px] text-amber-400/60">
                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{w.title}</span>
                {w.waiver?.reason && <span className="text-white/20 truncate">— "{w.waiver.reason}"</span>}
              </div>
            ))}
          </div>
        )}

        {/* Expanded: 5 criteria breakdown */}
        {expanded && (
          <div className="border-t border-white/5 pt-3 space-y-3">
            {/* 2.1 Phase 1 steps */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2.1 Phase 1 Steps</p>
              <CriterionBlock
                passed={blocksByPhase1.length === 0}
                label={blocksByPhase1.length === 0
                  ? `All ${ps.total || 0} Phase 1 steps resolved (${ps.done} done, ${ps.waived} waived)`
                  : `${ps.pending + ps.in_progress} of ${ps.total} steps incomplete`}
                detail={ps.total > 0 ? `Done: ${ps.done} · In Progress: ${ps.in_progress} · Pending: ${ps.pending} · Waived: ${ps.waived}` : 'No Phase 1 steps in build order'}
                items={blocksByPhase1}
              />
            </div>

            {/* 2.2 Publish blockers */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2.2 Publish Blockers</p>
              <CriterionBlock
                passed={blocksByBlocker.length === 0}
                label={blocksByBlocker.length === 0
                  ? `No unwaived publish blockers (${bs.total} total, all resolved or waived)`
                  : `${bs.unwaived} unwaived publish blocker${bs.unwaived !== 1 ? 's' : ''}`}
                items={blocksByBlocker}
              />
            </div>

            {/* 2.3 Critical risks */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2.3 Critical Risks (≥ 8)</p>
              <CriterionBlock
                passed={blocksByRisk.length === 0}
                label={blocksByRisk.length === 0
                  ? `No critical risks (${rs.total} total risks, 0 critical)`
                  : `${rs.critical} critical risk${rs.critical !== 1 ? 's' : ''} unaddressed`}
                items={blocksByRisk}
              />
            </div>

            {/* 2.4 Contradictions */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2.4 Contradictions & Integrity</p>
              <CriterionBlock
                passed={blocksByContradiction.length === 0}
                label={blocksByContradiction.length === 0
                  ? 'No contradictions or integrity flags'
                  : `${cs.total} contradiction${cs.total !== 1 ? 's' : ''} (${cs.integrity_flags} integrity flag${cs.integrity_flags !== 1 ? 's' : ''})`}
                items={blocksByContradiction.length > 0 ? (blocksByContradiction[0]?.items || []).map(t => ({ message: t })) : []}
              />
            </div>

            {/* 2.5 Weight stability */}
            <div className="space-y-1.5">
              <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">2.5 Weight Stability</p>
              <CriterionBlock
                passed={blocksByWeight.length === 0}
                label={blocksByWeight.length === 0
                  ? 'Weight distribution stable — 0 critical items'
                  : `${ws.critical} critical-weight item${ws.critical !== 1 ? 's' : ''} remain`}
              />
              <WeightMiniBar distribution={ws} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}