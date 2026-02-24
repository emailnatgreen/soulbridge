import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Trash2, Plus, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS = {
  view_did_document: 'View DID Document',
  update_did_profile: 'Update DID Profile',
  revoke_did: 'Revoke DID',
  initiate_wallet_transaction: 'Initiate Wallet Transaction'
};

export default function DidPermissionsDialog({ wallet, trigger }) {
  const [open, setOpen] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['did-permissions', wallet?.classic_address],
    queryFn: () => base44.entities.DidPermission.filter({ 
      did_classic_address: wallet.classic_address,
      status: 'active'
    }),
    enabled: !!wallet && open
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    enabled: open
  });

  const grantMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('grantDidPermission', data),
    onSuccess: () => {
      toast.success('Permission granted successfully');
      queryClient.invalidateQueries(['did-permissions']);
      setIsGranting(false);
      setSelectedAgent('');
      setSelectedAction('');
      setNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to grant permission');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (permissionId) => base44.functions.invoke('revokeDidPermission', { 
      permission_id: permissionId 
    }),
    onSuccess: () => {
      toast.success('Permission revoked successfully');
      queryClient.invalidateQueries(['did-permissions']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to revoke permission');
    }
  });

  const handleGrant = () => {
    if (!selectedAgent || !selectedAction) {
      toast.error('Please select an agent and action');
      return;
    }

    grantMutation.mutate({
      wallet_id: wallet.id,
      agent_id: selectedAgent,
      action: selectedAction,
      notes
    });
  };

  const handleRevoke = (permissionId) => {
    if (confirm('Are you sure you want to revoke this permission?')) {
      revokeMutation.mutate(permissionId);
    }
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unknown Agent';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Shield className="w-4 h-4 mr-2" />
            Manage Permissions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            DID Access Control
          </DialogTitle>
          <DialogDescription>
            Manage granular permissions for {wallet?.name || 'this DID'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grant New Permission Section */}
          {!isGranting ? (
            <div className="border-b pb-4">
              <Button onClick={() => setIsGranting(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Grant New Permission
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Grant New Permission
              </h3>
              
              <div>
                <Label>Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select Action</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add notes about this permission..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGrant}
                  disabled={grantMutation.isPending}
                  className="flex-1"
                >
                  {grantMutation.isPending ? 'Granting...' : 'Grant Permission'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsGranting(false);
                    setSelectedAgent('');
                    setSelectedAction('');
                    setNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Active Permissions List */}
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Active Permissions ({permissions.length})
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading permissions...
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No active permissions granted yet
              </div>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div 
                    key={permission.id}
                    className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getAgentName(permission.agent_id)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ACTION_LABELS[permission.action]}
                          </Badge>
                        </div>
                        {permission.notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {permission.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Granted {new Date(permission.created_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevoke(permission.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}