import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Coins, Shield, Loader2, AlertTriangle } from 'lucide-react';

export default function AgentNFTConfirmDialog({ open, onClose, onConfirm, form, cost, isPending }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="w-4 h-4 text-amber-400" /> Confirm Agent NFT Creation
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Review the details below before spending RLUSD.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Agent summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{form.agentName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[8px] capitalize">{form.role}</Badge>
                  {form.soulBound && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[8px] gap-0.5">
                      <Shield className="w-2 h-2" /> Soul-Bound
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-white/50 text-[10px] leading-relaxed">{form.purpose}</p>
          </div>

          {/* Cost breakdown */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-white text-xs font-medium">Creation Cost</span>
            </div>
            <span className="text-amber-300 font-bold text-sm">{cost} RLUSD</span>
          </div>

          {/* NFT ID */}
          {form.nftId && (
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
              <span className="text-white/40 text-[10px]">NFT ID</span>
              <span className="text-white font-mono text-[10px]">{form.nftId}</span>
            </div>
          )}

          {/* Type */}
          <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
            <span className="text-white/40 text-[10px]">Widget Type</span>
            <span className="text-white text-[10px] capitalize">{form.widgetType}</span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-200/70 text-[9px] leading-relaxed">
              This will deduct <strong>{cost} RLUSD</strong> from your balance and create both the Widget NFT entity and the Agent entity. This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="text-white/50 text-xs">Cancel</Button>
          </DialogClose>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            size="sm"
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs gap-1"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            Confirm — Spend {cost} RLUSD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}