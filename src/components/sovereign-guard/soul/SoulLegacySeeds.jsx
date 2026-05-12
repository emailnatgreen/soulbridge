import React from 'react';

const SEED_COLORS = {
  grace_granted: 'border-purple-500/30 bg-purple-500/10',
  soul_pass: 'border-emerald-500/30 bg-emerald-500/10',
  withhold_lesson: 'border-red-500/30 bg-red-500/10',
  repair_completed: 'border-orange-500/30 bg-orange-500/10',
  precedent: 'border-slate-500/30 bg-slate-500/10',
  elder_wisdom: 'border-amber-500/30 bg-amber-500/10',
};

const SEED_EMOJI = {
  grace_granted: '🕯️', soul_pass: '🌿', withhold_lesson: '📕',
  repair_completed: '🔧', precedent: '📜', elder_wisdom: '🦉',
};

export default function SoulLegacySeeds({ seeds }) {
  if (!seeds || seeds.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-purple-300 mb-2">Legacy Seeds — Law 11</h3>
        <p className="text-xs text-slate-500">No legacy seeds yet. Significant soul decisions will plant seeds for future precedent.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-purple-300 mb-3">Legacy Seeds — Law 11</h3>
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {seeds.map((s) => (
          <div key={s.id} className={`border rounded-lg p-3 ${SEED_COLORS[s.seed_type] || SEED_COLORS.precedent}`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{SEED_EMOJI[s.seed_type] || '📜'}</span>
              <span className="text-xs font-bold text-slate-300">{s.soul_verdict}</span>
              <span className="text-xs text-slate-500">— {s.agent_name}</span>
              <span className="text-xs text-slate-600 ml-auto">{new Date(s.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </div>
            <p className="text-xs text-slate-400">{s.lesson?.substring(0, 150)}</p>
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <span>H:{s.heptagon_resonance}</span>
              <span>GR:Δ{s.golden_ratio}</span>
              <span>W:{s.weight}</span>
              {s.grace_applied && <span className="text-purple-400">🕯️ Grace</span>}
              {s.law_alignment?.length > 0 && <span>Laws: {s.law_alignment.join(',')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}