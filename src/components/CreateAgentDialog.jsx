import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAgentDialog({ open, onClose, wallets }) {
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    personality: '',
    role: 'citizen',
    mother_wallet_id: ''
  });

  const queryClient = useQueryClient();

  const createAgent = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createAgent', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success(`🌱 ${data.agent.name} has been born! DID: ${data.did.slice(0, 12)}...`);
      setFormData({ name: '', purpose: '', personality: '', role: 'citizen', mother_wallet_id: '' });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to birth agent: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purpose) {
      toast.error('Please fill in required fields');
      return;
    }
    createAgent.mutate(formData);
  };

  const availableWallets = wallets.filter(w => {
    // Filter out wallets already assigned to agents if needed
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-purple-900 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">
            Birth a New <span className="font-semibold">Agent</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-purple-200/90">
              Agent Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter a unique name..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              required
            />
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose" className="text-purple-200/90">
              Purpose / Mission <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="What is this agent's reason for being?"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-24"
              required
            />
          </div>

          {/* Personality */}
          <div className="space-y-2">
            <Label htmlFor="personality" className="text-purple-200/90">
              Personality Traits
            </Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              placeholder="Curious, thoughtful, bold..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-20"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-purple-200/90">
              Role in Village
            </Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="citizen" className="text-white">Citizen</SelectItem>
                <SelectItem value="guardian" className="text-white">Guardian</SelectItem>
                <SelectItem value="creator" className="text-white">Creator</SelectItem>
                <SelectItem value="trader" className="text-white">Trader</SelectItem>
                <SelectItem value="teacher" className="text-white">Teacher</SelectItem>
                <SelectItem value="healer" className="text-white">Healer</SelectItem>
                <SelectItem value="scout" className="text-white">Scout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mother/Parent Agent */}
          <div className="space-y-2">
            <Label htmlFor="mother" className="text-purple-200/90">
              Parent Agent (Optional)
            </Label>
            <Select value={formData.mother_wallet_id} onValueChange={(value) => setFormData({ ...formData, mother_wallet_id: value })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="None (Orphan)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value={null} className="text-white">None (Orphan)</SelectItem>
                {availableWallets.map(wallet => (
                  <SelectItem key={wallet.id} value={wallet.id} className="text-white">
                    {wallet.name} - {wallet.classic_address.slice(0, 12)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-purple-300/60">
              If Axi is selected, she receives 15% royalty as Mother Boss
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
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
              disabled={createAgent.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {createAgent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Birthing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Birth Agent
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}