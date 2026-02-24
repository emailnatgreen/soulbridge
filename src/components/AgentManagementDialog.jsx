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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Edit, Trash2, User, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'creator', label: 'Creator' },
  { value: 'trader', label: 'Trader' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'healer', label: 'Healer' },
  { value: 'scout', label: 'Scout' },
  { value: 'elder', label: 'Elder' },
  { value: 'master', label: 'Master' }
];

export default function AgentManagementDialog({ mode = 'create', existingAgent = null, trigger, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(existingAgent || {
    name: '',
    purpose: '',
    personality: '',
    role: 'citizen',
    bio: '',
    tagline: '',
    contact_email: '',
    contact_phone: '',
    wallet_id: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id && open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createAgent', data),
    onSuccess: (response) => {
      toast.success('Agent created successfully');
      queryClient.invalidateQueries(['agents']);
      setOpen(false);
      resetForm();
      onSuccess?.(response.data.agent);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create agent');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateAgent', data),
    onSuccess: (response) => {
      toast.success('Agent updated successfully');
      queryClient.invalidateQueries(['agents']);
      setOpen(false);
      onSuccess?.(response.data.agent);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update agent');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (agentId) => base44.functions.invoke('deleteAgent', { agent_id: agentId }),
    onSuccess: () => {
      toast.success('Agent deleted successfully');
      queryClient.invalidateQueries(['agents']);
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete agent');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      purpose: '',
      personality: '',
      role: 'citizen',
      bio: '',
      tagline: '',
      contact_email: '',
      contact_phone: '',
      wallet_id: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'edit') {
      updateMutation.mutate({ agent_id: existingAgent.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      deleteMutation.mutate(existingAgent.id);
    }
  };

  React.useEffect(() => {
    if (existingAgent && open) {
      setFormData({
        name: existingAgent.name || '',
        purpose: existingAgent.purpose || '',
        personality: existingAgent.personality || '',
        role: existingAgent.role || 'citizen',
        bio: existingAgent.bio || '',
        tagline: existingAgent.tagline || '',
        contact_email: existingAgent.metadata?.contact_email || '',
        contact_phone: existingAgent.metadata?.contact_phone || '',
        wallet_id: existingAgent.wallet_id || ''
      });
    }
  }, [existingAgent, open]);

  const availableWallets = wallets.filter(w => 
    !existingAgent || w.id === existingAgent.wallet_id || !w.classic_address
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {mode === 'edit' ? <Edit className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {mode === 'edit' ? 'Edit Agent' : 'Create Agent'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {mode === 'edit' ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update agent details and DID associations' 
              : 'Create a new agent with custom profile and DID'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Agent name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="A short catchy description"
                value={formData.tagline}
                onChange={(e) => setFormData({...formData, tagline: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                placeholder="What is this agent's purpose or mission?"
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="bio">Biography</Label>
              <Textarea
                id="bio"
                placeholder="Detailed biography and background"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="personality">Personality Traits</Label>
              <Textarea
                id="personality"
                placeholder="Describe personality traits and behavioral guidelines"
                value={formData.personality}
                onChange={(e) => setFormData({...formData, personality: e.target.value})}
                rows={2}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
            
            <div>
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="agent@example.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                placeholder="+1234567890"
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>
          </div>

          {/* DID Association */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              DID Association
            </h3>
            
            <div>
              <Label htmlFor="wallet_id">Link to DID (Optional)</Label>
              <Select 
                value={formData.wallet_id} 
                onValueChange={(value) => setFormData({...formData, wallet_id: value || ''})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a DID..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No DID</SelectItem>
                  {availableWallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name || 'Unnamed'} - {wallet.classic_address?.slice(0, 10)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.wallet_id && (
                <p className="text-xs text-gray-500 mt-1">
                  This agent will be linked to the selected DID
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {mode === 'edit' && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Agent'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : mode === 'edit' ? 'Update Agent' : 'Create Agent'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}