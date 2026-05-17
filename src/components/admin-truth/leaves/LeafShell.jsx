import React from 'react';
import GroundingWatermark, { GroundingStripe } from './GroundingWatermark';

export default function LeafShell({ leaf, grounding, children, emptyText = 'No data collected for this leaf' }) {
  const Icon = leaf.icon;
  const isEmpty = !children;
  const grade = grounding?.grade;
  const showWatermark = grade && grade !== 'HIGH';

  return (
    <div className={`relative rounded-lg border ${showWatermark ? (grade === 'LOW' ? 'border-red-500/20' : 'border-amber-500/20') : 'border-slate-700/60'} bg-slate-900/60 p-4 space-y-2 overflow-hidden`}>
      <GroundingStripe grade={grade} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${leaf.color}`} />
          <span className={`text-xs font-semibold ${leaf.color}`}>Leaf {leaf.num}: {leaf.label}</span>
          <span className="text-slate-500 text-[9px] hidden sm:inline">— {leaf.purpose}</span>
        </div>
        <p className="text-slate-500 text-[9px] italic">{leaf.desc}</p>
        <GroundingWatermark grade={grade} confidence={grounding?.confidence} />
        {isEmpty ? (
          <p className="text-slate-500 text-xs italic pt-1">{emptyText}</p>
        ) : (
          <div className="pt-1">{children}</div>
        )}
      </div>
    </div>
  );
}