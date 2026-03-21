import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function EditAgent() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('id');
  
  const queryClient = useQueryClient();

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ id: agentId });
      return agents[0];
    },
    enabled: !!agentId,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const [formData, setFormData] = useState({
    wallet_id: '',
    name: '',
    purpose: '',
    personality: '',
  });

  // Seed assignment state
  const [seed, setSeed] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState('');

  const handleAssignSeed = async (e) => {
    e.preventDefault();
    setSeedError('');
    setSeedResult(null);
    if (!seed) return;
    const currentWalletId = formData.wallet_id || agent?.wallet_id;
    if (!currentWalletId) {
      setSeedError('No wallet assigned to this agent. Save a wallet first.');
      return;
    }
    setSeedLoading(true);
    try {
      const res = await base44.functions.invoke('assignWalletSeed', { wallet_id: currentWalletId, seed });
      if (res.data?.success) {
        setSeedResult(res.data.message);
        setSeed('');
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
      } else {
        setSeedError(res.data?.error || 'Failed to assign seed');
      }
    } catch (err) {
      setSeedError(err?.response?.data?.error || err.message || 'Failed to assign seed');
    } finally {
      setSeedLoading(false);
    }
  };

  React.useEffect(() => {
    if (agent) {
      setFormData({
        wallet_id: agent.wallet_id || '',
        name: agent.name || '',
        purpose: agent.purpose || '',
        personality: agent.personality || '',
      });
    }
  }, [agent]);

  const updateAgent = useMutation({
    mutationFn: (data) => base44.entities.Agent.update(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update agent: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateAgent.mutate(formData);
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <p className="text-white">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Agents')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Edit <span className="font-semibold">{agent.name}</span>
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Agent Settings</CardTitle>
            <CardDescription className="text-purple-300/60">
              Update agent configuration and wallet assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-purple-200/90">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet" className="text-purple-200/90">
                  Wallet
                </Label>
                <Select
                  value={formData.wallet_id}
                  onValueChange={(value) => setFormData({ ...formData, wallet_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.network}) - {wallet.balance} XRP
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-300/50">
                  Current: {wallets.find(w => w.id === agent.wallet_id)?.classic_address || 'N/A'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-purple-200/90">
                  Purpose
                </Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 h-32 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality" className="text-purple-200/90">
                  Personality
                </Label>
                <Textarea
                  id="personality"
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 h-48 resize-none"
                />
              </div>

              {/* Seed Assignment */}
              <div className="border-t border-white/10 pt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <Label className="text-amber-300/90 font-medium">Assign / Reassign Wallet Seed</Label>
                </div>
                <p className="text-white/40 text-xs">Enter the wallet seed to encrypt and store it. The derived address must match the wallet on file.</p>
                <form onSubmit={handleAssignSeed} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSeed ? 'text' : 'password'}
                      value={seed}
                      onChange={e => setSeed(e.target.value)}
                      placeholder="s… (family seed / secret)"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono pr-10"
                    />
                    <button type="button" onClick={() => setShowSeed(v => !v)}
                      className="absolute right-3 top-2 text-white/40 hover:text-white/70">
                      {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button type="submit" disabled={seedLoading || !seed}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                    {seedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Seed'}
                  </Button>
                </form>
                {seedError && (
                  <p className="text-red-300 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {seedError}
                  </p>
                )}
                {seedResult && (
                  <p className="text-green-300 text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {seedResult}
                  </p>
                )}
                <p className="text-white/25 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500/50" />
                  Seed is encrypted server-side using AES-256-GCM and never stored in plain text.
                </p>
              </div>

              <Button
                type="submit"
                disabled={updateAgent.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 h-12 text-base"
              >
                {updateAgent.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}