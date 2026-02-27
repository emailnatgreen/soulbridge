import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_CREDENTIAL_MAP } from './RoleCredentialMapper';

export default function AgentRoleAssignment({ agent, agentCredentials = [], onRoleAssigned }) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const queryClient = useQueryClient();

  const activeCredentials = agentCredentials.filter(c => c.status === 'active');

  const roleOptions = useMemo(() => {
    return Object.entries(ROLE_CREDENTIAL_MAP)
      .map(([key, config]) => {
        const requiredButMissing = config.requiredCredentials
          .filter(rc => !rc.optional)
          .filter(rc => !activeCredentials.some(c => c.credential_type === rc.type));

        const canAssign = requiredButMissing.length === 0;

        return {
          key,
          ...config,
          canAssign,
          missingCount: requiredButMissing.length,
          missingCredentials: requiredButMissing,
        };
      })
      .filter(r => r.key !== agent?.role); // Don't show current role
  }, [agent, activeCredentials]);

  const assignRoleMutation = useMutation({
    mutationFn: (roleKey) => {
      // Create audit log and update agent role
      return Promise.all([
        base44.entities.Agent.update(agent.id, { role: roleKey }),
        base44.entities.DidAuditLog.create({
          action_type: 'agent_updated',
          agent_id: agent.id,
          user_id: null,
          action_details: {
            field: 'role',
            old_value: agent.role,
            new_value: roleKey,
            reason: 'credential_based_assignment',
            credentials_verified: activeCredentials.map(c => c.id),
          },
          success: true,
        }),
      ]);
    },
    onSuccess: () => {
      toast.success(`Role updated to ${ROLE_CREDENTIAL_MAP[selectedRole].displayName}`);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setOpen(false);
      setSelectedRole(null);
      onRoleAssigned?.();
    },
    onError: (error) => {
      toast.error('Failed to assign role');
    },
  });

  const handleAssignRole = () => {
    if (selectedRole) {
      assignRoleMutation.mutate(selectedRole);
    }
  };

  const currentRoleConfig = agent && ROLE_CREDENTIAL_MAP[agent.role];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Lock className="w-4 h-4 mr-2" />
          Change Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Update Agent Role</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Role */}
          {currentRoleConfig && (
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-xs text-white/50 mb-2">Current Role</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentRoleConfig.icon}</span>
                <div>
                  <div className="font-semibold text-white">{currentRoleConfig.displayName}</div>
                  <div className="text-xs text-white/40">{currentRoleConfig.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* Available Roles */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white/80">Available Roles</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {roleOptions.length === 0 ? (
                <div className="text-center py-6 text-white/40 text-sm">
                  No other roles available. {activeCredentials.length === 0 ? 'Agent needs credentials to unlock roles.' : ''}
                </div>
              ) : (
                roleOptions.map((roleOpt) => (
                  <button
                    key={roleOpt.key}
                    onClick={() => setSelectedRole(roleOpt.key)}
                    disabled={!roleOpt.canAssign}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedRole === roleOpt.key
                        ? 'bg-indigo-600/30 border-indigo-500/50'
                        : roleOpt.canAssign
                        ? 'bg-slate-800/30 border-white/10 hover:border-white/20'
                        : 'bg-slate-800/20 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{roleOpt.icon}</span>
                        <div>
                          <div className="font-semibold text-white text-sm">{roleOpt.displayName}</div>
                          <div className="text-xs text-white/50">{roleOpt.description}</div>
                        </div>
                      </div>
                      {roleOpt.canAssign ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                      )}
                    </div>

                    {/* Credential Requirements */}
                    <div className="ml-8 space-y-1 text-xs">
                      {roleOpt.requiredCredentials.map((req, idx) => {
                        const hasCred = activeCredentials.some(
                          c => c.credential_type === req.type
                        );
                        return (
                          <div key={idx} className={hasCred ? 'text-white/50' : 'text-orange-300'}>
                            {hasCred ? '✓' : '✗'} {req.name}
                            {req.optional && <span className="text-white/30"> (optional)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Confirmation */}
          {selectedRole && (
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 text-sm space-y-2">
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-white/70">
                  Role will be updated to <span className="font-semibold text-indigo-300">{ROLE_CREDENTIAL_MAP[selectedRole].displayName}</span> based on verified credentials.
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole || assignRoleMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {assignRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                'Confirm & Update'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}