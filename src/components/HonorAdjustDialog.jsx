import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HonorAdjustDialog({ agent, open, onClose }) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const updateHonor = useMutation({
    mutationFn: async ({ agentId, newScore, reason }) => {
      // Update agent honor score
      await base44.entities.Agent.update(agentId, {
        honor_score: newScore
      });

      // Create memory of the adjustment
      await base44.entities.Memory.create({
        agent_id: agentId,
        type: 'observation',
        content: `Honor adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}. Reason: ${reason}`,
        keywords: ['honor', 'adjustment', 'governance'],
        context: `Adjusted by governance on ${new Date().toISOString()}`,
        importance: Math.abs(adjustment) > 20 ? 9 : 7,
        related_entity_id: agentId,
        related_entity_type: 'Agent'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Honor score updated');
      setAdjustment(0);
      setReason('');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update honor score');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    const currentScore = agent.honor_score || 100;
    const newScore = Math.max(0, Math.min(100, currentScore + adjustment));

    updateHonor.mutate({
      agentId: agent.id,
      newScore,
      reason
    });
  };

  const currentScore = agent.honor_score || 100;
  const newScore = Math.max(0, Math.min(100, currentScore + adjustment));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-purple-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Adjust Honor Score</DialogTitle>
          <p className="text-sm text-white/60">{agent.name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Current Score Display */}
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-sm text-white/40 mb-1">Current Honor</div>
            <div className="text-4xl font-light text-white mb-2">
              {currentScore}
            </div>
            {adjustment !== 0 && (
              <div className="flex items-center justify-center gap-2">
                {adjustment > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                <span className={adjustment > 0 ? 'text-green-400' : 'text-red-400'}>
                  {adjustment > 0 ? '+' : ''}{adjustment} → {newScore}
                </span>
              </div>
            )}
          </div>

          {/* Adjustment Slider */}
          <div className="space-y-4">
            <Label>Adjustment Amount</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustment(Math.max(-50, adjustment - 5))}
                className="bg-white/5 border-white/10 text-white"
              >
                -5
              </Button>
              <div className="flex-1">
                <Slider
                  value={[adjustment]}
                  onValueChange={(val) => setAdjustment(val[0])}
                  min={-50}
                  max={50}
                  step={5}
                  className="[&_[role=slider]]:bg-purple-500"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustment(Math.min(50, adjustment + 5))}
                className="bg-white/5 border-white/10 text-white"
              >
                +5
              </Button>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>-50 (Severe)</span>
              <span>0 (No Change)</span>
              <span>+50 (Exceptional)</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustment(-30)}
              className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
            >
              Severe -30
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustment(-10)}
              className="bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20"
            >
              Minor -10
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustment(10)}
              className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
            >
              Good +10
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustment(20)}
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            >
              Excellent +20
            </Button>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Adjustment *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this adjustment is being made..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-24"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateHonor.isPending || adjustment === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {updateHonor.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Apply Adjustment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}