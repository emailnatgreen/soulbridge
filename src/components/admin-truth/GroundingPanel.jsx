import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle2, AlertTriangle, HelpCircle, Shield } from 'lucide-react';

const STATUS_CONFIG = {
  verified: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', label: 'VERIFIED' },
  partial: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', label: 'PARTIAL' },
  inferred: { icon: HelpCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', label: 'INFERRED' },
};

function GroundingBar({ summary }) {
  if (!summary) return null;
  const { verified, partial, inferred, total } = summary;
  const vPct = total > 0 ? (verified / total) * 100 : 0;
  const pPct = total > 0 ? (partial / total) * 100 : 0;
  const iPct = total > 0 ? (inferred / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800">
        {vPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${vPct}%` }} />}
        {pPct > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${pPct}%` }} />}
        {iPct > 0 && <div className="bg-red-500/70 transition-all" style={{ width: `${iPct}%` }} />}
      </div>
      <div className="flex justify-between text-[9px]">
        <span className="text-emerald-400">{verified} verified</span>
        <span className="text-amber-400">{partial} partial</span>
        <span className="text-red-400">{inferred} inferred</span>
      </div>
    </div>
  );
}

function GroundingItem({ item }) {
  const config = STATUS_CONFIG[item.grounding_status] || STATUS_CONFIG.inferred;
  const Icon = config.icon;

  return (
    <div className={`rounded-lg ${config.bg} border ${config.border} p-3 space-y-1.5`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-slate-200 text-xs font-medium truncate">{item.title}</p>
            <Badge className={`text-[7px] ${config.bg} ${config.color} ${config.border} shrink-0`}>{config.label}</Badge>
          </div>
          <p className="text-slate-400 text-[10px] mt-0.5">{item.grounding_reason}</p>
          {item.specifics_detected && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.specifics_detected.proposal_refs?.map((ref, i) => (
                <Badge key={`pr-${i}`} className="text-[7px] bg-red-500/10 text-red-300 border-red-500/30">unverified: {ref}</Badge>
              ))}
              {item.specifics_detected.coefficients?.map((c, i) => (
                <Badge key={`co-${i}`} className="text-[7px] bg-red-500/10 text-red-300 border-red-500/30">unverified: {c}</Badge>
              ))}
              {item.specifics_detected.numbers?.length > 3 && (
                <Badge className="text-[7px] bg-red-500/10 text-red-300 border-red-500/30">{item.specifics_detected.numbers.length} unverified numerics</Badge>
              )}
            </div>
          )}
          {item.corroborating_entities?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.corroborating_entities.map((e, i) => (
                <Badge key={i} className="text-[7px] bg-slate-700/50 text-slate-300 border-slate-600/50">
                  {e.entity} ({e.record_count})
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GroundingPanel({ investigation }) {
  const metrics = investigation?.metrics;
  const rawData = investigation?.leaves?.raw_data || [];

  // Check if grounding data exists (v3.0.0+)
  const hasGrounding = rawData.some(item => item.grounding_status);
  if (!hasGrounding) {
    return (
      <Card className="bg-slate-900/80 border-slate-700/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Database className="w-4 h-4" />
            <span>Grounding layer not available — investigation predates v3.0.0</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gradeColor = metrics?.grounding_grade === 'HIGH' ? 'text-emerald-400' :
    metrics?.grounding_grade === 'MEDIUM' ? 'text-amber-400' : 'text-red-400';

  return (
    <Card className="bg-slate-900/80 border-slate-700/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          Grounding Layer
          <Badge className="text-[8px] bg-violet-600/25 text-violet-200 border-violet-500/40">v1.0.0</Badge>
          <span className="ml-auto text-[10px] text-slate-500">
            Every claim cross-referenced against actual database records
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dual Confidence Display */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 text-center">
            <p className="text-slate-500 text-[9px] uppercase tracking-wider">Framework</p>
            <p className="text-xl font-bold text-violet-300">{metrics?.framework_confidence || 0}%</p>
            <p className="text-slate-600 text-[8px]">analytical structure</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 text-center">
            <p className="text-slate-500 text-[9px] uppercase tracking-wider">Grounding</p>
            <p className={`text-xl font-bold ${gradeColor}`}>{metrics?.grounding_confidence || 0}%</p>
            <p className="text-slate-600 text-[8px]">data-verified claims</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 text-center">
            <p className="text-slate-500 text-[9px] uppercase tracking-wider">Effective</p>
            <p className={`text-xl font-bold ${metrics?.confidence_score >= 70 ? 'text-emerald-300' : metrics?.confidence_score >= 40 ? 'text-amber-300' : 'text-red-300'}`}>
              {metrics?.confidence_score || 0}%
            </p>
            <p className="text-slate-600 text-[8px]">√(framework × grounding)</p>
          </div>
        </div>

        {/* Grounding Grade Banner */}
        {metrics?.grounding_grade === 'LOW' && (
          <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 text-xs font-medium">Low Grounding — Specific claims not verified against database</p>
              <p className="text-red-400/70 text-[10px] mt-0.5">
                The analytical framework is sound, but specific data points (names, numbers, IDs) were synthesised by the LLM.
                Treat specific claims as hypotheses requiring independent verification, not established facts.
              </p>
            </div>
          </div>
        )}

        {/* Distribution Bar */}
        <GroundingBar summary={metrics?.grounding_summary} />

        {/* Individual Items */}
        <div className="space-y-2">
          {rawData.filter(item => item.grounding_status).map((item, i) => (
            <GroundingItem key={i} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}