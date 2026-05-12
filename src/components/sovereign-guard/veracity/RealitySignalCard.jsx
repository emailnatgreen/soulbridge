import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function RealitySignalCard({ label, value, suffix, isText, trend, penalty, bonus, loreNote }) {
  const trendIcon = trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-400" />
    : trend === 'down' ? <TrendingDown className="w-3 h-3 text-red-400" />
    : <Minus className="w-3 h-3 text-white/20" />;

  const trendBorder = trend === 'up' ? 'border-emerald-500/20' 
    : trend === 'down' ? 'border-red-500/20' 
    : 'border-white/10';

  return (
    <Card className={`bg-white/[0.03] ${trendBorder}`}>
      <CardContent className="py-3 px-3">
        <div className="flex items-start justify-between mb-1">
          <p className="text-white/40 text-[10px] leading-tight">{label}</p>
          {trendIcon}
        </div>
        <p className={`text-lg font-bold ${isText ? 'text-sm' : ''} text-white`}>
          {value}{suffix && <span className="text-white/30 text-xs">{suffix}</span>}
        </p>
        {(typeof penalty === 'number' && penalty !== 0) && (
          <p className="text-red-400/70 text-[10px]">{penalty} penalty</p>
        )}
        {(typeof bonus === 'number' && bonus > 0) && (
          <p className="text-emerald-400/70 text-[10px]">+{bonus} bonus</p>
        )}
        {loreNote && (
          <p className="text-purple-300/40 text-[9px] italic mt-1">{loreNote}</p>
        )}
      </CardContent>
    </Card>
  );
}