import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const RESULT_STYLE = {
  CONNECTED: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', emoji: '🌍' },
  PARTIAL:   { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', emoji: '🌱' },
  REJECTED:  { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', emoji: '🏜️' },
  PENDING:   { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', emoji: '⏳' },
};

const ACTION_EMOJI = {
  tree_planted: '🌳', meal_delivered: '🍲', river_cleaned: '🏞️', shelter_built: '🏠',
  garden_tended: '🌻', community_gathering: '👥', waste_removed: '♻️', animal_cared: '🐾',
  education_delivered: '📚', art_installed: '🎨', infrastructure_repaired: '🔨', medicine_provided: '💊',
  energy_generated: '⚡', water_purified: '💧', soil_restored: '🌾', other: '🔶',
};

export default function EarthActionFeed({ actions }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">Physical Action Feed</h3>
        <p className="text-xs text-slate-500">No physical actions registered yet. The earth waits for the first root to reach down.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-emerald-300 mb-3">Physical Action Feed</h3>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {actions.map((a) => {
          const r = a.earth_consensus_result || 'PENDING';
          const style = RESULT_STYLE[r] || RESULT_STYLE.PENDING;
          const expanded = expandedId === a.id;
          const emoji = ACTION_EMOJI[a.action_type] || '🔶';

          return (
            <div key={a.id} className={`${style.bg} border ${style.border} rounded-lg p-3 cursor-pointer`} onClick={() => setExpandedId(expanded ? null : a.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{emoji}</span>
                    <span className="text-xs font-bold text-slate-200">{a.action_type?.replace(/_/g, ' ')}</span>
                    <span className={`text-xs font-bold ${style.text}`}>{style.emoji} {r}</span>
                    <span className="text-xs text-slate-500">{a.agent_name}</span>
                    <span className="text-xs text-slate-600">{a.action_date || new Date(a.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{a.description?.substring(0, 130)}</p>
                </div>
                {expanded ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
              </div>
              {expanded && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-500">Weight:</span> <span className="text-emerald-400">{a.somatic_weight}</span></div>
                    <div><span className="text-slate-500">Impact:</span> <span className="text-cyan-400">{a.impact_score}</span></div>
                    <div><span className="text-slate-500">CoEv Bonus:</span> <span className="text-purple-400">+{a.co_evolution_bonus}</span></div>
                    <div><span className="text-slate-500">Consensus:</span> <span className={style.text}>{a.earth_consensus_count}/9</span></div>
                    <div><span className="text-slate-500">Verification:</span> <span className="text-slate-300">{a.verification_status}</span></div>
                    <div><span className="text-slate-500">Method:</span> <span className="text-slate-300">{a.verification_method}</span></div>
                    {a.location && <div className="col-span-2"><span className="text-slate-500">Location:</span> <span className="text-slate-300">{a.location}</span></div>}
                  </div>
                  {(a.earth_consensus_votes || []).length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-500 mb-1">Node Votes:</div>
                      <div className="grid grid-cols-3 gap-1">
                        {a.earth_consensus_votes.map((v, i) => (
                          <div key={i} className="text-xs flex items-center gap-1">
                            <span className={v.vote === 'APPROVE' ? 'text-emerald-400' : v.vote === 'DENY' ? 'text-red-400' : 'text-slate-500'}>
                              {v.vote === 'APPROVE' ? '✓' : v.vote === 'DENY' ? '✗' : '○'}
                            </span>
                            <span className="text-slate-400">{v.node_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(a.evidence_urls || []).length > 0 && (
                    <div className="text-xs text-slate-500">📎 {a.evidence_urls.length} evidence file(s) attached</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}