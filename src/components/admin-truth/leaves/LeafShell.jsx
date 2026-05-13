import React from 'react';

export default function LeafShell({ leaf, children, emptyText = 'No data collected for this leaf' }) {
  const Icon = leaf.icon;
  const isEmpty = !children;

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${leaf.color}`} />
        <span className={`text-xs font-semibold ${leaf.color}`}>Leaf {leaf.num}: {leaf.label}</span>
        <span className="text-slate-500 text-[9px] hidden sm:inline">— {leaf.purpose}</span>
      </div>
      <p className="text-slate-500 text-[9px] italic">{leaf.desc}</p>
      {isEmpty ? (
        <p className="text-slate-500 text-xs italic pt-1">{emptyText}</p>
      ) : (
        <div className="pt-1">{children}</div>
      )}
    </div>
  );
}