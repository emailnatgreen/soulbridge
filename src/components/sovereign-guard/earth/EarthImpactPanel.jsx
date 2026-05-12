import React from 'react';

const ACTION_EMOJI = {
  tree_planted: '🌳', meal_delivered: '🍲', river_cleaned: '🏞️', shelter_built: '🏠',
  garden_tended: '🌻', community_gathering: '👥', waste_removed: '♻️', animal_cared: '🐾',
  education_delivered: '📚', art_installed: '🎨', infrastructure_repaired: '🔨', medicine_provided: '💊',
  energy_generated: '⚡', water_purified: '💧', soil_restored: '🌾', other: '🔶',
};

export default function EarthImpactPanel({ typeDistribution, trends }) {
  const sorted = Object.entries(typeDistribution || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-emerald-300 mb-3">Somatic Impact</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">{trends?.connected || 0}</div>
          <div className="text-xs text-slate-500">🌍 Connected</div>
        </div>
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-bold text-cyan-400">{trends?.avg_impact || 0}</div>
          <div className="text-xs text-slate-500">Avg Impact</div>
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-1.5">
          {sorted.map(([type, count]) => {
            const emoji = ACTION_EMOJI[type] || '🔶';
            const maxCount = sorted[0][1];
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span>{emoji}</span>
                <span className="text-slate-400 w-28 truncate">{type.replace(/_/g, ' ')}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-slate-300 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No physical actions yet.</p>
      )}
    </div>
  );
}