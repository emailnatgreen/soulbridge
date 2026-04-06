import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Activity, Zap, Clock, Heart } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AgentStateDisplay({ agent, agentState }) {
  if (!agentState) return null;

  const getEnergyColor = (energy) => {
    if (energy >= 70) return 'text-green-400';
    if (energy >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMoodIcon = (mood) => {
    const moodIcons = {
      'calm': '😌',
      'focused': '🎯',
      'energetic': '⚡',
      'tired': '😴',
      'thoughtful': '🤔',
      'joyful': '😊',
    };
    return moodIcons[mood] || '🔮';
  };

  const statusColors = {
    available: 'bg-green-500/20 text-green-300 border-green-500/30',
    busy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    resting: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    focused: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60 font-medium">PRESENCE STATE</span>
        <Badge className={cn("border text-xs", statusColors[agentState.current_activity] || statusColors.available)}>
          {agentState.current_activity || 'available'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/60 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Energy
          </span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full bg-gradient-to-r",
                  agentState.energy >= 70 ? 'from-green-500 to-green-400' :
                  agentState.energy >= 40 ? 'from-yellow-500 to-yellow-400' :
                  'from-red-500 to-red-400'
                )}
                style={{ width: `${agentState.energy}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium", getEnergyColor(agentState.energy))}>
              {agentState.energy}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/60 flex items-center gap-2">
            <Heart className="w-3 h-3" />
            Mood
          </span>
          <span className="text-xs">
            {getMoodIcon(agentState.mood)} {agentState.mood}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/60 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Wisdom
          </span>
          <span className="text-xs text-purple-300">{agentState.wisdom || 0} pts</span>
        </div>

        {agentState.current_location && (
          <div className="flex items-center justify-between">
            <span className="text-white/60 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Location
            </span>
            <span className="text-xs text-white/40">{agentState.current_location}</span>
          </div>
        )}
      </div>

      {agentState.energy < 30 && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
          <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-red-300">{agent.name} is running low on energy and may need rest</span>
        </div>
      )}
    </div>
  );
}