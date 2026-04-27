import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Loader2, Heart, Shield } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_ROLES = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];

export default function AgentNFTForm() {
  const [form, setForm] = useState({
    agentName: '', purpose: '', personality: '', role: 'citizen',
    bio: '', tagline: '', imageUrl: '', nftId: '',
    bindToDID: true, soulBound: true,
  });
  const queryClient = useQueryClient();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Fetch user's agents for context
  const { data: myAgents = [] } = useQuery({
    queryKey: ['myAgentsWorkshop'],
    queryFn: () => base44.entities.Agent.list('-created_date', 50),
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();

      // 1. Create the Agent entity
      const agent = await base44.entities.Agent.create({
        name: form.agentName,
        purpose: form.purpose,
        personality: form.personality,
        role: form.role,
        bio: form.bio,
        tagline: form.tagline,
        avatar_url: form.imageUrl,
        status: 'active',
        honor_score: 100,
        permissions: {
          can_create_agents: false,
          can_send_xrp: true,
          can_access_treasury: false,
          can_vote: true,
          can_evaluate_agents: false,
        },
      });

      // 2. Create the corresponding Widget NFT for this agent
      const widget = await base44.entities.Widget.create({
        name: `Agent NFT: ${form.agentName}`,
        nft_id: form.nftId || undefined,
        description: `Soul-bound NFT representing AI Agent "${form.agentName}". Purpose: ${form.purpose}`,
        widget_type: 'unlock',
        widget_class: 'unlock',
        category: 'agent_creation',
        ui_behavior: 'badge',
        version: '1.0.0',
        image_url: form.imageUrl,
        minted_by: user.email,
        creator_id: user.email,
        mint_status: 'draft',
        metadata_version: '1.0.0',
        transferable: !form.soulBound,
        burnable: false,
        taxon: 0,
        transfer_fee: 0,
        feature_path: `/agents/${agent.id}`,
        allowed_agent_permissions: ['can_vote', 'can_send_xrp'],
      });

      return { agent, widget };
    },
    onSuccess: ({ agent }) => {
      toast.success(`AI Agent "${agent.name}" created with its soul-bound NFT`);
      setForm({
        agentName: '', purpose: '', personality: '', role: 'citizen',
        bio: '', tagline: '', imageUrl: '', nftId: '',
        bindToDID: true, soulBound: true,
      });
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['myAgentsWorkshop'] });
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Bot className="w-4 h-4 text-amber-400" /> Create AI Agent NFT</CardTitle>
        <CardDescription className="text-white/40 text-xs">
          Mint a sovereign AI Agent with its own on-chain identity. Each agent is bound to a soul-bound NFT under DID-owner accountability, governed by the 11 Laws of Honour.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Soul-Bound Notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <Heart className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-amber-200/80 text-[10px] leading-relaxed">
            Agent NFTs are soul-bound by default — they represent a living, accountable AI identity and cannot be traded. The DID owner bears full responsibility for the agent's behaviour under Law 1 (Soul).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Agent Name *</Label>
            <Input value={form.agentName} onChange={e => set('agentName', e.target.value)} placeholder="e.g. Nova" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget NFT ID</Label>
            <Input value={form.nftId} onChange={e => set('nftId', e.target.value)} placeholder="e.g. WIDGET-AGT-001" className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{AGENT_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Purpose / Mission *</Label>
          <Textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="What is this agent's mission in the Village?" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Personality</Label>
          <Textarea value={form.personality} onChange={e => set('personality', e.target.value)} placeholder="Behavioural traits, communication style, values…" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Tagline</Label>
            <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="A short motto or subtitle" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Avatar URL</Label>
            <Input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Bio</Label>
          <Textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Detailed biography and introduction…" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
        </div>

        {/* Soul-Bound toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-white text-xs font-medium">Soul-Bound (Non-transferable)</p>
              <p className="text-white/40 text-[10px]">Agent NFTs bound to your DID cannot be transferred</p>
            </div>
          </div>
          <Switch checked={form.soulBound} onCheckedChange={v => set('soulBound', v)} />
        </div>

        <Button onClick={() => mutation.mutate()} disabled={!form.agentName || !form.purpose || mutation.isPending} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          Create AI Agent &amp; Mint NFT
        </Button>

        {/* Existing agents count */}
        {myAgents.length > 0 && (
          <p className="text-white/30 text-[10px]">You currently have {myAgents.length} agent{myAgents.length !== 1 ? 's' : ''} in the Village.</p>
        )}
      </CardContent>
    </Card>
  );
}