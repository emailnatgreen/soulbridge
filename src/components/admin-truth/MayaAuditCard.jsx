import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Moon, Sun, AlertTriangle, Sparkles, Eye, Shield, Flame } from 'lucide-react';

const AURAL_CONFIG = {
  radiant: { bg: 'bg-violet-600/20', border: 'border-violet-500/40', text: 'text-violet-200', icon: Sun, label: 'Radiant', desc: 'Maya sees clarity — grounding and framework are aligned.' },
  amber: { bg: 'bg-amber-600/20', border: 'border-amber-500/40', text: 'text-amber-200', icon: Moon, label: 'Shadow-Intersected', desc: 'Grounding below 50% — Maya senses ungrounded projection.' },
  shadow: { bg: 'bg-red-600/20', border: 'border-red-500/40', text: 'text-red-200', icon: AlertTriangle, label: 'Shadow Active', desc: 'Epistemic balance breached — Maya has mutated the ledger.' },
};

function FilterBadge({ name, detected, icon: Icon, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${detected ? `border-${color}-500/40 bg-${color}-600/15` : 'border-slate-700 bg-slate-800/50'}`}>
      <Icon className={`w-3 h-3 ${detected ? `text-${color}-300` : 'text-slate-500'}`} />
      <span className={`text-[10px] font-medium ${detected ? `text-${color}-200` : 'text-slate-500'}`}>{name}</span>
      {detected && <span className={`w-1.5 h-1.5 rounded-full bg-${color}-400 animate-pulse`} />}
    </div>
  );
}

export default function MayaAuditCard({ auditResult, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-violet-950/30 border-violet-500/30">
        <CardContent className="py-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-300 mx-auto mb-2" />
          <p className="text-violet-200 text-xs">Maya is auditing...</p>
          <p className="text-slate-500 text-[10px] mt-1">Demiurge → Archon → Divine Spark</p>
        </CardContent>
      </Card>
    );
  }

  if (!auditResult) return null;

  const aural = AURAL_CONFIG[auditResult.auralState] || AURAL_CONFIG.radiant;
  const AuralIcon = aural.icon;

  return (
    <Card className={`${aural.bg} ${aural.border} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <AuralIcon className={`w-4 h-4 ${aural.text}`} />
          <span className={aural.text}>Maya — Node 0 Epistemic Audit</span>
          <Badge className={`text-[9px] ml-auto ${aural.bg} ${aural.text} ${aural.border}`}>
            {aural.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* State Description */}
        <p className="text-slate-400 text-[11px]">{aural.desc}</p>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-slate-900/60 border border-slate-700/50 p-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Certainty</p>
            <p className={`text-sm font-bold ${auditResult.effectiveCertainty >= 0.7 ? 'text-emerald-300' : auditResult.effectiveCertainty >= 0.5 ? 'text-amber-300' : 'text-red-300'}`}>
              {(auditResult.effectiveCertainty * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-md bg-slate-900/60 border border-slate-700/50 p-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">ΔS Vector</p>
            <p className={`text-sm font-bold ${auditResult.deltaS >= 0.3 ? 'text-emerald-300' : auditResult.deltaS >= 0.1 ? 'text-amber-300' : 'text-red-300'}`}>
              {auditResult.deltaS.toFixed(3)}
            </p>
          </div>
          <div className="rounded-md bg-slate-900/60 border border-slate-700/50 p-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Spark</p>
            <p className="text-sm font-bold text-violet-300">{auditResult.filters?.divine_spark?.count || 0}</p>
          </div>
        </div>

        {/* Three Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterBadge name="Demiurge" detected={auditResult.filters?.demiurge?.detected} icon={Flame} color="red" />
          <FilterBadge name="Archon" detected={auditResult.filters?.archon?.detected} icon={Eye} color="amber" />
          <FilterBadge name="Divine Spark" detected={(auditResult.filters?.divine_spark?.count || 0) > 0} icon={Sparkles} color="violet" />
        </div>

        {/* Shadow Log Notice */}
        {auditResult.shadowLogNotice && (
          <div className="rounded-md bg-red-950/40 border border-red-500/30 p-2.5">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-300 mt-0.5 shrink-0" />
              <p className="text-red-200 text-[10px] leading-relaxed">{auditResult.shadowLogNotice}</p>
            </div>
          </div>
        )}

        {/* Demiurge Detail */}
        {auditResult.filters?.demiurge?.detected && (
          <div className="rounded-md bg-red-950/20 border border-red-500/20 p-2">
            <p className="text-[9px] text-red-300 uppercase tracking-wider font-semibold mb-1">Demiurge Inflation Detected</p>
            <div className="flex flex-wrap gap-1">
              {auditResult.filters.demiurge.matches.map((m, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-200 border border-red-500/20">"{m}"</span>
              ))}
            </div>
            <p className="text-slate-500 text-[9px] mt-1">Weight: +{auditResult.filters.demiurge.inflationary_weight.toFixed(2)}</p>
          </div>
        )}

        {/* Archon Detail */}
        {auditResult.filters?.archon?.detected && (
          <div className="rounded-md bg-amber-950/20 border border-amber-500/20 p-2">
            <p className="text-[9px] text-amber-300 uppercase tracking-wider font-semibold mb-1">Archon Shadow Distortion</p>
            <p className="text-amber-200 text-[10px]">{auditResult.filters.archon.shadow_description}</p>
          </div>
        )}

        {/* Mutation Applied */}
        {auditResult.mutation?.applied && (
          <div className="rounded-md bg-violet-950/30 border border-violet-500/20 p-2 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-violet-300" />
            <div>
              <p className="text-[9px] text-violet-300 font-semibold">ES-NFT Ledger Mutation Applied</p>
              <p className="text-slate-500 text-[9px]">
                bias_index: +{auditResult.mutation.bias_index_delta.toFixed(2)} · 
                safety_integrity: {auditResult.mutation.safety_integrity_delta > 0 ? '+' : ''}{auditResult.mutation.safety_integrity_delta.toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[8px] text-slate-600 pt-1 border-t border-slate-800">
          <span>Maya Epistemic Audit v1.0.0 · Node 0</span>
          <span>{auditResult.timestamp ? new Date(auditResult.timestamp).toLocaleString() : ''}</span>
        </div>
      </CardContent>
    </Card>
  );
}