import React from 'react';
import { Badge } from '@/components/ui/badge';

const WEIGHT_STYLES = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function SuggestedWeightBadge({ weight, category, showScore = true }) {
  if (weight === undefined && !category) return null;
  const cat = category || (weight >= 12 ? 'critical' : weight >= 8 ? 'high' : weight >= 4 ? 'medium' : 'low');
  
  return (
    <Badge className={`text-[8px] gap-1 ${WEIGHT_STYLES[cat] || WEIGHT_STYLES.medium}`}>
      W:{showScore && weight !== undefined ? `${weight}` : ''} {cat}
    </Badge>
  );
}