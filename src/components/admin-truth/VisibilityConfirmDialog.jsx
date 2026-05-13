import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function VisibilityConfirmDialog({ open, onClose, onConfirm, field, newValue, investigation, buildOrder }) {
  const [reason, setReason] = useState('');
  const synthesis = investigation?.leaves?.synthesis || {};
  const metrics = investigation?.metrics || {};

  const weightDist = metrics.weight_distribution || {};
  const remaining = buildOrder?.summary || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Confirm Exposure Change
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            You are about to change <span className="text-white/70 font-medium">{field.replace('_', ' ')}</span> to <span className="text-emerald-400 font-semibold">{newValue}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Risk summary */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">Cost of Exposure</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {remaining.blockers > 0 && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px]">{remaining.blockers} blockers</Badge>}
              {remaining.tests_required > 0 && <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/25 text-[9px]">{remaining.tests_required} tests</Badge>}
              {weightDist.critical > 0 && <Badge className="bg-red-500/15 text-red-300 text-[9px]">{weightDist.critical} critical</Badge>}
              {weightDist.high > 0 && <Badge className="bg-amber-500/15 text-amber-300 text-[9px]">{weightDist.high} high</Badge>}
              {weightDist.medium > 0 && <Badge className="bg-blue-500/15 text-blue-300 text-[9px]">{weightDist.medium} medium</Badge>}
              <Badge className="bg-white/5 text-white/30 text-[9px]">{remaining.total || 0} total steps</Badge>
            </div>
          </div>

          {/* Synthesis summary */}
          {synthesis.summary && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold mb-1">Last Synthesis</p>
              <p className="text-white/50 text-[10px] leading-relaxed line-clamp-3">{synthesis.summary}</p>
              {synthesis.confidence_score > 0 && (
                <Badge className={`text-[9px] mt-1.5 ${synthesis.confidence_score >= 70 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {synthesis.confidence_score}% confidence
                </Badge>
              )}
            </div>
          )}

          {/* Reason (optional but encouraged) */}
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Reason (optional but encouraged)</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why are you changing visibility?"
              className="bg-white/[0.03] border-white/10 text-white text-xs h-16 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white/50 text-xs">Cancel</Button>
          <Button onClick={() => { onConfirm(reason); setReason(''); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1">
            <ShieldCheck className="w-3 h-3" /> Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}