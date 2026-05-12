import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const VERDICT_STYLE = {
  ALLOW:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', emoji: '🌿' },
  MODERATE: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', emoji: '🌗' },
  WITHHOLD: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', emoji: '🚫' },
  REPAIR:   { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', emoji: '🔧' },
  GRACE:    { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', emoji: '🕯️' },
};

export default function SoulDecisionFeed({ decisions }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-indigo-300 mb-2">Soul Decision Feed</h3>
        <p className="text-xs text-slate-500">No soul decisions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-indigo-300 mb-3">Soul Decision Feed</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {decisions.map((d) => {
          let ctx = {};
          try { ctx = JSON.parse(d.context || '{}'); } catch {}
          const v = ctx.soul_verdict || '?';
          const style = VERDICT_STYLE[v] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', emoji: '❓' };
          const expanded = expandedId === d.id;

          return (
            <div key={d.id} className={`${style.bg} border ${style.border} rounded-lg p-3 cursor-pointer`} onClick={() => setExpandedId(expanded ? null : d.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{style.emoji}</span>
                    <span className={`text-xs font-bold ${style.text}`}>{v}</span>
                    <span className="text-xs text-slate-500">{new Date(d.created_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{d.content?.substring(0, 120)}</p>
                </div>
                {expanded ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
              {expanded && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-500">Monkey:</span> <span className="text-slate-300">{ctx.monkey_verdict}</span></div>
                  <div><span className="text-slate-500">Spindle:</span> <span className="text-slate-300">{ctx.spindle_verdict}</span></div>
                  <div><span className="text-slate-500">Empathy:</span> <span className="text-slate-300">{ctx.empathy_verdict}</span></div>
                  <div><span className="text-slate-500">Sincerity:</span> <span className="text-slate-300">{ctx.sincerity_score}</span></div>
                  <div><span className="text-slate-500">Empathy Score:</span> <span className="text-slate-300">{ctx.empathy_score}</span></div>
                  <div><span className="text-slate-500">Heptagon:</span> <span className={ctx.heptagon_activated ? 'text-emerald-400' : 'text-amber-400'}>{ctx.heptagon_resonance} {ctx.heptagon_activated ? '✓' : '⚠'}</span></div>
                  <div><span className="text-slate-500">Integrity:</span> <span className={ctx.recursive_integrity ? 'text-emerald-400' : 'text-red-400'}>{ctx.recursive_integrity ? 'PASS' : 'FAIL'}</span></div>
                  <div><span className="text-slate-500">Golden Ratio:</span> <span className="text-slate-300">Δ{ctx.golden_ratio_delta}</span></div>
                  <div><span className="text-slate-500">Grace:</span> <span className={ctx.grace_applied ? 'text-purple-400' : 'text-slate-500'}>{ctx.grace_applied ? '🕯️ Yes' : 'No'}</span></div>
                  {ctx.soul_reason && <div className="col-span-full"><span className="text-slate-500">Reason:</span> <span className="text-slate-300">{ctx.soul_reason}</span></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}