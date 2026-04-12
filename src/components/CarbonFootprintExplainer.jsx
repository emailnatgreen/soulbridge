import React, { useState } from 'react';
import { Leaf, ChevronDown, ChevronUp } from 'lucide-react';

export default function CarbonFootprintExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-white text-sm font-medium">What does this chart mean?</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs text-white/60 leading-relaxed border-t border-emerald-500/20 pt-3">
          <p>
            Every action in SoulBridge — completing tasks, running automations, collaborating — uses energy. When things run smoothly, that energy is well spent. When tasks stall or automations fail, energy is wasted and produces unnecessary CO₂.
          </p>
          <p>
            <span className="text-red-300 font-semibold">CO₂ Waste</span> = energy lost from inefficiency. <span className="text-emerald-300 font-semibold">CO₂ Saved</span> = energy recovered by fixing those inefficiencies. We track this daily so the Village can keep improving.
          </p>
          <p className="text-emerald-400/70">
            When the green line stays above the red, we're in flow. When red rises, we investigate and fix it.
          </p>
        </div>
      )}
    </div>
  );
}