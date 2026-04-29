import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, Coins } from 'lucide-react';

export default function AgentNFTRoyaltiesEditor({ royalties, onChange }) {
  const total = (royalties.treasury_percent || 0) + (royalties.creator_percent || 0) + (royalties.referral_percent || 0);
  const isValid = total === 100;

  const set = (key, val) => {
    onChange({ ...royalties, [key]: parseFloat(val) || 0 });
  };

  return (
    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-green-400" />
          <Label className="text-green-300 text-xs font-semibold">Royalties Split</Label>
          <span className="text-[9px] text-green-400/60 bg-green-500/10 px-2 py-0.5 rounded-full">Required for Service NFTs</span>
        </div>
        {isValid ? (
          <span className="flex items-center gap-1 text-green-400 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5" /> {total}%</span>
        ) : (
          <span className="flex items-center gap-1 text-red-400 text-[9px]"><AlertTriangle className="w-2.5 h-2.5" /> {total}% ≠ 100%</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-white/50 text-[10px]">Treasury %</Label>
          <Input
            type="number"
            value={royalties.treasury_percent}
            onChange={e => set('treasury_percent', e.target.value)}
            min="0" max="100" step="1"
            className="bg-white/5 border-white/10 text-white text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-white/50 text-[10px]">Creator %</Label>
          <Input
            type="number"
            value={royalties.creator_percent}
            onChange={e => set('creator_percent', e.target.value)}
            min="0" max="100" step="1"
            className="bg-white/5 border-white/10 text-white text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-white/50 text-[10px]">Referral %</Label>
          <Input
            type="number"
            value={royalties.referral_percent}
            onChange={e => set('referral_percent', e.target.value)}
            min="0" max="100" step="1"
            className="bg-white/5 border-white/10 text-white text-xs h-8"
          />
        </div>
      </div>

      <p className="text-white/30 text-[9px]">
        Revenue from this service is split between Village Treasury, the creator, and any referral agent. Must total exactly 100%.
      </p>
    </div>
  );
}