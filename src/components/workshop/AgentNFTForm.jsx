import React, { useState, useEffect } from 'react';
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
import WorkshopBalanceGate from './WorkshopBalanceGate';
import MetadataJsonEditor from './MetadataJsonEditor';
import FeaturePathBuilder from './FeaturePathBuilder';
import ServiceDefinitionLinker from './ServiceDefinitionLinker';
import { METADATA_STANDARD_VERSION, getDefaultCustomData } from '@/lib/nftMetadataSchemas';

const AGENT_ROLES = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];

export default function AgentNFTForm() {
  const [form, setForm] = useState({
    agentName: '', purpose: '', personality: '', role: 'citizen',
    bio: '', tagline: '', imageUrl: '', nftId: '',
    nftCost: '', servicePrice: '', serviceFeePercent: '',
    streamCost: '', streamUnit: 'day',
    bindToDID: true, soulBound: true,
    featurePath: '', widgetType: 'unlock', serviceLink: null,
  });
  const [customData, setCustomData] = useState(getDefaultCustomData('agent'));
  const queryClient = useQueryClient();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Sync form → custom_data
  useEffect(() => {
    setCustomData({
      agent_name: form.agentName,
      role: form.role,
      purpose: form.purpose,
      personality: form.personality,
      tagline: form.tagline,
      bio: form.bio,
      avatar_url: form.imageUrl,
      soul_bound: form.soulBound,
      nft_cost_rlusd: parseFloat(form.nftCost) || 0,
      service_fee_percent: parseFloat(form.serviceFeePercent) || 0,
      pricing: {
        service_price_rlusd: parseFloat(form.servicePrice) || 0,
        stream_cost_rlusd: parseFloat(form.streamCost) || 0,
        stream_interval: form.streamUnit,
      },
    });
  }, [form.agentName, form.role, form.purpose, form.personality, form.tagline, form.bio, form.imageUrl, form.soulBound, form.nftCost, form.serviceFeePercent, form.servicePrice, form.streamCost, form.streamUnit]);

  // Sync custom_data → form (from JSON editor)
  const handleCustomDataChange = (newData) => {
    setCustomData(newData);
    if (newData.agent_name !== undefined) set('agentName', newData.agent_name);
    if (newData.role) set('role', newData.role);
    if (newData.purpose !== undefined) set('purpose', newData.purpose);
    if (newData.personality !== undefined) set('personality', newData.personality);
    if (newData.tagline !== undefined) set('tagline', newData.tagline);
    if (newData.bio !== undefined) set('bio', newData.bio);
    if (newData.avatar_url !== undefined) set('imageUrl', newData.avatar_url);
    if (newData.soul_bound !== undefined) set('soulBound', newData.soul_bound);
    if (newData.nft_cost_rlusd !== undefined) set('nftCost', String(newData.nft_cost_rlusd || ''));
    if (newData.service_fee_percent !== undefined) set('serviceFeePercent', String(newData.service_fee_percent || ''));
    if (newData.pricing) {
      if (newData.pricing.service_price_rlusd !== undefined) set('servicePrice', String(newData.pricing.service_price_rlusd || ''));
      if (newData.pricing.stream_cost_rlusd !== undefined) set('streamCost', String(newData.pricing.stream_cost_rlusd || ''));
      if (newData.pricing.stream_interval) set('streamUnit', newData.pricing.stream_interval);
    }
  };

  // Fetch user's agents for context
  const { data: myAgents = [] } = useQuery({
    queryKey: ['myAgentsWorkshop'],
    queryFn: () => base44.entities.Agent.list('-created_date', 50),
    staleTime: 30000,
  });

  const [refreshPricing, setRefreshPricing] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('workshopNFTCreate', {
        action: 'create',
        nft_type: 'agent',
        custom_data: customData,
        metadata_standard_version: METADATA_STANDARD_VERSION,
        service_definition: form.serviceLink || undefined,
        widget_data: {
          name: `Agent NFT: ${form.agentName}`,
          nft_id: form.nftId || undefined,
          description: `Soul-bound NFT representing AI Agent "${form.agentName}". Purpose: ${form.purpose}`,
          widget_type: form.widgetType,
          widget_class: form.widgetType,
          category: 'agent_creation',
          ui_behavior: form.widgetType === 'service' ? 'activate_feature' : 'badge',
          feature_path: form.featurePath || undefined,
          version: '1.0.0',
          image_url: form.imageUrl,
          transferable: !form.soulBound,
          burnable: false,
          taxon: 0,
          transfer_fee: 0,
          allowed_agent_permissions: ['can_vote', 'can_send_xrp'],
          cost_per_stream_interval: parseFloat(form.streamCost) || 0,
          stream_interval_unit: form.streamUnit,
        },
        agent_data: {
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
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || `AI Agent created with its soul-bound NFT`);
      setForm({
        agentName: '', purpose: '', personality: '', role: 'citizen',
        bio: '', tagline: '', imageUrl: '', nftId: '',
        nftCost: '', servicePrice: '', serviceFeePercent: '',
        streamCost: '', streamUnit: 'day',
        bindToDID: true, soulBound: true,
        featurePath: '', widgetType: 'unlock', serviceLink: null,
      });
      setCustomData(getDefaultCustomData('agent'));
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['myAgentsWorkshop'] });
      refreshPricing?.();
    },
  });

  return (
    <WorkshopBalanceGate nftType="agent">
      {({ canAfford, cost, refreshPricing: rp }) => {
        if (!refreshPricing && rp) setRefreshPricing(() => rp);
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

        {/* Economics Section */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
          <p className="text-amber-300 text-xs font-semibold">💰 NFT Economics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-red-300 text-xs">Cost of NFT (RLUSD) *</Label>
              <Input type="number" value={form.nftCost} onChange={e => set('nftCost', e.target.value)} placeholder="60" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">One-time price users pay to own this agent NFT</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Service Price (RLUSD)</Label>
              <Input type="number" value={form.servicePrice} onChange={e => set('servicePrice', e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">Per-use charge for the service (0 = free)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-300 text-xs">Service Fee % → Treasury</Label>
              <Input type="number" value={form.serviceFeePercent} onChange={e => set('serviceFeePercent', e.target.value)} placeholder="1" min="0" max="100" step="0.1" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">% of each transaction sent to Village Treasury (e.g. 1 = 1%)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Stream Cost (RLUSD)</Label>
              <Input type="number" value={form.streamCost} onChange={e => set('streamCost', e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">Ongoing cost per interval (0 = none)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Stream Interval</Label>
              <Select value={form.streamUnit} onValueChange={v => set('streamUnit', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['second', 'minute', 'hour', 'day'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Widget Type for agent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget Type</Label>
            <Select value={form.widgetType} onValueChange={v => set('widgetType', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlock">Unlock (passive)</SelectItem>
                <SelectItem value="service">Service (active/streaming)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feature Path Builder */}
        <FeaturePathBuilder
          value={form.featurePath}
          onChange={v => set('featurePath', v)}
          widgetType={form.widgetType}
        />

        {/* Service Definition Linker */}
        <ServiceDefinitionLinker
          widgetType={form.widgetType}
          nftId={form.nftId}
          serviceId={form.serviceLink}
          onServiceIdChange={v => set('serviceLink', v)}
        />

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

        {/* Dynamic Metadata JSON Editor */}
        <MetadataJsonEditor
          nftType="agent"
          customData={customData}
          onCustomDataChange={handleCustomDataChange}
          commonFields={{
            name: `Agent NFT: ${form.agentName}`,
            description: `Soul-bound NFT representing AI Agent "${form.agentName}". Purpose: ${form.purpose}`,
            nft_id: form.nftId, image_url: form.imageUrl,
            version: '1.0.0', taxon: 0, transfer_fee: 0,
            transferable: !form.soulBound, burnable: false,
          }}
        />

        <Button onClick={() => mutation.mutate()} disabled={!form.agentName || !form.purpose || mutation.isPending || !canAfford} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          Create AI Agent NFT — {cost} RLUSD
        </Button>

        {/* Existing agents count */}
        {myAgents.length > 0 && (
          <p className="text-white/30 text-[10px]">You currently have {myAgents.length} agent{myAgents.length !== 1 ? 's' : ''} in the Village.</p>
        )}
      </CardContent>
    </Card>
        );
      }}
    </WorkshopBalanceGate>
  );
}