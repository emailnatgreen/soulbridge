import React from 'react';
import { Sparkles } from 'lucide-react';

export default function DashboardProgressRing({ owned, total }) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-pink-900/10 p-5 flex items-center gap-5">
      {/* Ring */}
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="48" cy="48" r="40" fill="none"
            stroke="url(#progressGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg">{pct}%</span>
          <span className="text-white/30 text-[8px]">unlocked</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">Your SoulBridge</h3>
        </div>
        <p className="text-white/40 text-xs leading-relaxed">
          You own <span className="text-white font-semibold">{owned}</span> of <span className="text-white font-semibold">{total}</span> infrastructure NFTs. 
          {pct === 100 ? ' Full sovereign access.' : ` Unlock more to expand your dashboard.`}
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1">
            <span className="text-green-300 text-[10px] font-semibold">{owned} Owned</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1">
            <span className="text-white/40 text-[10px] font-semibold">{total - owned} Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}