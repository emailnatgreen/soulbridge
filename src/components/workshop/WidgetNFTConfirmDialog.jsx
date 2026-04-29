import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

export default function WidgetNFTConfirmDialog({ open, onClose, onConfirm, form, cost, isPending }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Confirm Widget NFT Creation
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Review the details below before minting. This action costs RLUSD and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Name</span>
              <span className="text-white text-xs font-medium">{form.name}</span>
            </div>
            {form.nft_id && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">NFT ID</span>
                <span className="text-purple-300 text-xs font-mono">{form.nft_id}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Type</span>
              <Badge variant="outline" className="text-[9px] border-white/20 text-white/70">
                {form.widget_type === 'service' ? 'Service (active)' : 'Unlock (passive)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Category</span>
              <span className="text-white/70 text-xs capitalize">{form.category?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">UI Behaviour</span>
              <span className="text-white/70 text-xs capitalize">{form.ui_behavior?.replace(/_/g, ' ')}</span>
            </div>
            {form.feature_path && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">Feature Path</span>
                <span className="text-emerald-300 text-xs font-mono">{form.feature_path}</span>
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <span className="text-amber-300 text-xs font-semibold">Minting Cost</span>
            <span className="text-white text-sm font-bold">{cost} RLUSD</span>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-200/70 text-[10px] leading-relaxed">
              This is a non-refundable action. Once created, the widget will be registered on-chain and the RLUSD will be deducted from your balance.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/50 hover:text-white text-xs">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs gap-1.5"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Confirm & Mint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}