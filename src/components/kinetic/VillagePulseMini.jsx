import { Zap, TrendingUp, Users, Activity } from 'lucide-react';

export default function VillagePulseMini({ kus = [], agentCount = 0, votesCount = 0, economicVolume = 0 }) {
  const totalKUs = kus.length;
  const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const uniqueAgents = new Set(kus.map(k => k.agent_id)).size;
  const energyIndex = Math.min(Math.round((totalWeighted / Math.max(totalKUs, 1)) * 20), 100);

  if (totalKUs === 0) return null;

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-xs">Village Pulse</h3>
            <p className="text-white/30 text-[9px]">Live Kinetic Energy</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-green-300 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'KUs', value: totalKUs, icon: Zap, color: 'text-purple-300' },
          { label: 'Contributors', value: uniqueAgents || agentCount, icon: Users, color: 'text-blue-300' },
          { label: 'Energy', value: energyIndex, icon: TrendingUp, color: 'text-amber-300' },
          { label: 'XRP Vol', value: economicVolume > 0 ? economicVolume.toFixed(1) : '—', icon: Activity, color: 'text-green-300' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <s.icon className={`w-3 h-3 mx-auto mb-0.5 ${s.color} opacity-60`} />
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[8px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Energy bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-700"
            style={{ width: `${energyIndex}%` }}
          />
        </div>
        <p className="text-white/20 text-[9px] text-center">
          {energyIndex >= 70 ? 'Village thriving' : energyIndex >= 40 ? 'Steady momentum' : 'Grid warming up'}
        </p>
      </div>
    </div>
  );
}