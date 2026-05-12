import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Clock, Pause } from 'lucide-react';

const STATUS_CONFIG = {
  active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Shield, lore: 'Walking' },
  probation: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: AlertTriangle, lore: 'Under Repair' },
  suspended: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: Pause, lore: 'Silenced' },
  dormant: { color: 'bg-white/10 text-white/40 border-white/10', icon: Clock, lore: 'Sleeping' },
};

export default function VeracityAgentRow({ agent, showLore, isSelected, onSelect }) {
  const config = STATUS_CONFIG[agent.status] || STATUS_CONFIG.dormant;
  const Icon = config.icon;
  const honor = typeof agent.honor_score === 'number' ? agent.honor_score : 50;
  const warningCount = Array.isArray(agent.warnings) ? agent.warnings.length : 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
        isSelected ? 'bg-white/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-white/30'}`} />
        <div>
          <p className="text-white text-xs font-medium">{agent.name}</p>
          <p className="text-white/30 text-[10px]">
            {showLore ? agent.role || 'citizen' : `ID: ${agent.id.slice(-8)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {warningCount > 0 && (
          <span className="text-red-400/60 text-[10px]">{warningCount} warn</span>
        )}
        <span className={`text-xs font-mono ${honor >= 80 ? 'text-emerald-400' : honor >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {showLore ? `♡${honor}` : honor}
        </span>
        <Badge className={`text-[9px] ${config.color}`}>
          {showLore ? config.lore : agent.status}
        </Badge>
      </div>
    </button>
  );
}