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
    wallet_id: ''
  });

  const queryClient = useQueryClient();

  const createAgent = useMutation({
    mutationFn: (data) => base44.entities.Agent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent birthed successfully! 🌟');
      setFormData({ name: '', purpose: '', personality: '', wallet_id: '' });
      onClose();
    },
    onError: () => {
      toast.error('Failed to birth agent');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purpose || !formData.wallet_id) {
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

          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-purple-200/90">
              Assign Wallet / DID <span className="text-red-400">*</span>
            </Label>
            {availableWallets.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-300">
                No wallets available. Create a wallet first.
              </div>
            ) : (
              <Select value={formData.wallet_id} onValueChange={(value) => setFormData({ ...formData, wallet_id: value })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a wallet..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {availableWallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id} className="text-white">
                      {wallet.name} - {wallet.classic_address.slice(0, 12)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              disabled={createAgent.isPending || availableWallets.length === 0}
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