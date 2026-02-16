import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function PermissionsDialog({ agent, open, onClose }) {
  const [permissions, setPermissions] = useState(
    agent.permissions || {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true
    }
  );
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const updatePermissions = useMutation({
    mutationFn: async ({ agentId, permissions, reason }) => {
      // Update agent permissions
      await base44.entities.Agent.update(agentId, {
        permissions
      });

      // Create memory of permission change
      await base44.entities.Memory.create({
        agent_id: agentId,
        type: 'observation',
        content: `Permissions updated: ${reason}`,
        keywords: ['permissions', 'governance', 'access'],
        context: `Updated by governance on ${new Date().toISOString()}`,
        importance: 8,
        related_entity_id: agentId,
        related_entity_type: 'Agent'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Permissions updated');
      setReason('');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update permissions');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the change');
      return;
    }

    updatePermissions.mutate({
      agentId: agent.id,
      permissions,
      reason
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-purple-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Permissions
          </DialogTitle>
          <p className="text-sm text-white/60">{agent.name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Permission Toggles */}
          <div className="space-y-4 bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-white">Create Agents</Label>
                <p className="text-xs text-white/40 mt-1">
                  Allow this agent to birth new agents
                </p>
              </div>
              <Switch
                checked={permissions.can_create_agents}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_create_agents: checked })
                }
              />
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-white">Send XRP</Label>
                <p className="text-xs text-white/40 mt-1">
                  Allow this agent to send XRP transactions
                </p>
              </div>
              <Switch
                checked={permissions.can_send_xrp}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_send_xrp: checked })
                }
              />
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-white">Access Treasury</Label>
                <p className="text-xs text-white/40 mt-1">
                  Grant access to Village treasury (requires DAO approval)
                </p>
              </div>
              <Switch
                checked={permissions.can_access_treasury}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_access_treasury: checked })
                }
              />
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-white">Vote in DAO</Label>
                <p className="text-xs text-white/40 mt-1">
                  Allow this agent to participate in governance votes
                </p>
              </div>
              <Switch
                checked={permissions.can_vote}
                onCheckedChange={(checked) =>
                  setPermissions({ ...permissions, can_vote: checked })
                }
              />
            </div>
          </div>

          {/* Warning for Treasury Access */}
          {permissions.can_access_treasury && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-300 text-sm">
                <Shield className="w-4 h-4" />
                Treasury access is a significant privilege. Ensure this agent has earned trust.
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Change *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these permissions are being granted or revoked..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-20"
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
              disabled={updatePermissions.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {updatePermissions.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Permissions'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}