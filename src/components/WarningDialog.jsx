import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WarningDialog({ agent, open, onClose }) {
  const [severity, setSeverity] = useState('minor');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const severityConfig = {
    minor: { label: 'Minor', honorDeduction: -5, color: 'text-yellow-400' },
    moderate: { label: 'Moderate', honorDeduction: -15, color: 'text-orange-400' },
    severe: { label: 'Severe', honorDeduction: -30, color: 'text-red-400' }
  };

  const issueWarning = useMutation({
    mutationFn: async ({ agentId, warning, honorDeduction }) => {
      const currentWarnings = agent.warnings || [];
      const currentScore = agent.honor_score || 100;
      const newScore = Math.max(0, currentScore + honorDeduction);

      // Update agent with new warning and adjusted honor
      await base44.entities.Agent.update(agentId, {
        warnings: [...currentWarnings, warning],
        honor_score: newScore,
        status: newScore < 50 ? 'probation' : agent.status
      });

      // Create memory of the warning
      await base44.entities.Memory.create({
        agent_id: agentId,
        type: 'observation',
        content: `Warning issued: ${warning.reason}. Honor reduced by ${Math.abs(honorDeduction)} to ${newScore}.`,
        keywords: ['warning', 'governance', 'discipline', severity],
        context: `Warning issued by governance on ${new Date().toISOString()}`,
        importance: 9,
        related_entity_id: agentId,
        related_entity_type: 'Agent'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Warning issued successfully');
      setSeverity('minor');
      setReason('');
      onClose();
    },
    onError: () => {
      toast.error('Failed to issue warning');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    const config = severityConfig[severity];
    const warning = {
      date: new Date().toISOString(),
      reason: reason,
      severity: severity,
      issued_by: 'Axi'
    };

    issueWarning.mutate({
      agentId: agent.id,
      warning,
      honorDeduction: config.honorDeduction
    });
  };

  const currentScore = agent.honor_score || 100;
  const config = severityConfig[severity];
  const newScore = Math.max(0, currentScore + config.honorDeduction);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-orange-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Issue Warning
          </DialogTitle>
          <p className="text-sm text-white/60">{agent.name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Current Warnings */}
          {agent.warnings && agent.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-300 font-medium mb-2">
                Previous Warnings: {agent.warnings.length}
              </p>
              <div className="text-xs text-yellow-300/70 space-y-1">
                {agent.warnings.slice(-2).map((w, idx) => (
                  <div key={idx}>• {w.reason}</div>
                ))}
              </div>
            </div>
          )}

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity Level</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="minor" className="text-white">
                  Minor (-5 honor)
                </SelectItem>
                <SelectItem value="moderate" className="text-white">
                  Moderate (-15 honor)
                </SelectItem>
                <SelectItem value="severe" className="text-white">
                  Severe (-30 honor)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Honor Impact */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-white/40">Current Honor</div>
                <div className="text-2xl font-light text-white">{currentScore}</div>
              </div>
              <div className="text-2xl text-white/40">→</div>
              <div>
                <div className="text-sm text-white/40">After Warning</div>
                <div className={`text-2xl font-light ${config.color}`}>{newScore}</div>
              </div>
            </div>
            {newScore < 50 && (
              <div className="mt-3 text-xs text-red-300 bg-red-500/10 rounded p-2">
                ⚠️ This will place the agent on probation
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Warning *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the violation or concerning behavior..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-24"
              required
            />
            <p className="text-xs text-white/40">
              This will be recorded in the Village archives
            </p>
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
              disabled={issueWarning.isPending}
              className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
            >
              {issueWarning.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Issue Warning
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}