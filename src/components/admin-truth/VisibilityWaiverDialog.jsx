import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function VisibilityWaiverDialog({ open, onClose, onWaive, blockers }) {
  const [reasons, setReasons] = useState({});

  const allReasoned = blockers.every(b => (reasons[b.step_id] || '').trim().length > 0);

  const handleWaive = () => {
    const waivers = blockers.map(b => ({
      step_id: b.step_id,
      waived_reason: reasons[b.step_id]?.trim() || '',
      waived_at: new Date().toISOString(),
    }));
    onWaive(waivers);
    setReasons({});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Waive Phase 1 Blockers
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            {blockers.length} blocker{blockers.length !== 1 ? 's' : ''} must be waived before public exposure. Each requires a mandatory reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
          {blockers.map(b => (
            <div key={b.step_id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px]">
                <Badge className="text-[8px] bg-red-500/20 text-red-300 border-red-500/30">{b.step_id}</Badge>
                <ArrowRight className="w-2.5 h-2.5 text-white/20" />
                <span className="text-white/70">{b.title}</span>
              </div>
              {b.suggested_weight > 0 && (
                <span className="text-white/25 text-[8px]">Weight: {b.suggested_weight} ({b.weight_category})</span>
              )}
              <Textarea
                value={reasons[b.step_id] || ''}
                onChange={e => setReasons(prev => ({ ...prev, [b.step_id]: e.target.value }))}
                placeholder="Mandatory: why is this being waived?"
                className="bg-white/[0.03] border-white/10 text-white text-xs h-14 resize-none"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/50 text-xs">Cancel</Button>
          <Button
            onClick={handleWaive}
            disabled={!allReasoned}
            className="bg-red-600 hover:bg-red-500 text-white text-xs gap-1 disabled:opacity-40"
          >
            <ShieldAlert className="w-3 h-3" /> Waive {blockers.length} Blocker{blockers.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}