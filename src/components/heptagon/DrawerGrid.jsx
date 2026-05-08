import React, { useMemo } from 'react';

const CELL_SIZE = 28;
const GAP = 2;

export default function DrawerGrid({ drawers, highlightChain, prisonerNumber, success }) {
  const chainSet = useMemo(() => {
    if (!highlightChain) return new Set();
    return new Set(highlightChain.map(s => s.drawer));
  }, [highlightChain]);

  const slipMap = useMemo(() => {
    if (!highlightChain) return {};
    const m = {};
    highlightChain.forEach(s => { m[s.drawer] = s.step; });
    return m;
  }, [highlightChain]);

  if (!drawers || drawers.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-center">
        <p className="text-slate-500 text-xs">No drawers — run a simulation to see the grid</p>
      </div>
    );
  }

  const cols = 10;

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 overflow-x-auto">
      <div
        className="grid gap-px mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          width: 'fit-content',
        }}
      >
        {drawers.map((slip, idx) => {
          const isStart = idx === prisonerNumber;
          const isInChain = chainSet.has(idx);
          const isTarget = slip === prisonerNumber && isInChain;
          const stepNum = slipMap[idx];

          let bg = 'bg-slate-800/60';
          let border = 'border-white/5';
          let textColor = 'text-white/30';

          if (isTarget && success !== false) {
            bg = 'bg-amber-500/30';
            border = 'border-amber-400/60';
            textColor = 'text-amber-300';
          } else if (isInChain) {
            bg = 'bg-blue-500/20';
            border = 'border-blue-400/40';
            textColor = 'text-blue-300';
          } else if (isStart) {
            bg = 'bg-purple-500/20';
            border = 'border-purple-400/40';
            textColor = 'text-purple-300';
          }

          return (
            <div
              key={idx}
              className={`${bg} border ${border} rounded-sm flex flex-col items-center justify-center relative`}
              style={{ width: CELL_SIZE, height: CELL_SIZE }}
              title={`Drawer ${idx} → Slip ${slip}${stepNum !== undefined ? ` (step ${stepNum + 1})` : ''}`}
            >
              <span className={`text-[8px] font-mono ${textColor}`}>{slip}</span>
              {stepNum !== undefined && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 text-[6px] text-white flex items-center justify-center font-bold">
                  {stepNum + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-white/30">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/40" /> Start</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/30" /> Chain</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/40" /> Found</span>
      </div>
    </div>
  );
}