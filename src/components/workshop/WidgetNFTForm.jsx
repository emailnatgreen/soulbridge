import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WorkshopBalanceGate from './WorkshopBalanceGate';

const CATEGORIES = ['agent_creation', 'skill', 'environment', 'governance', 'training', 'wallet_management', 'did_management', 'other'];
const UI_BEHAVIORS = ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'];

const INITIAL = {
  name: '', description: '', image_url: '', category: 'other',
  widget_type: 'unlock', widget_class: 'unlock', ui_behavior: 'unlock_page',
  version: '1.0.0', feature_path: '', nft_id: '',
  service_price: '', cost_per_stream_interval: '', stream_interval_unit: 'hour',
  taxon: '0', transferFee: '0', transferable: false, burnable: false,
};

export default function WidgetNFTForm() {
  const [form, setForm] = useState(INITIAL);
  const queryClient = useQueryClient();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const [refreshPricing, setRefreshPricing] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        widget_class: form.widget_type,
        nft_id: form.nft_id || undefined,
        version: form.version || '1.0.0',
        taxon: parseInt(form.taxon) || 0,
        transfer_fee: parseInt(form.transferFee) || 0,
        transferable: form.transferable,
        burnable: form.burnable,
      };
      delete payload.transferFee;
      if (form.widget_type === 'service') {
        payload.cost_per_stream_interval = parseFloat(form.cost_per_stream_interval) || 0;
      } else {
        delete payload.cost_per_stream_interval;
        delete payload.stream_interval_unit;
      }
      const res = await base44.functions.invoke('workshopNFTCreate', {
        action: 'create',
        nft_type: 'widget',
        widget_data: payload,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Widget NFT created as draft');
      setForm(INITIAL);
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      refreshPricing?.();
    },
  });

  return (
    <WorkshopBalanceGate nftType="widget">
      {({ canAfford, cost, refreshPricing: rp }) => {
        if (!refreshPricing && rp) setRefreshPricing(() => rp);
        return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="w-4 h-4 text-purple-400" /> Create Widget NFT</CardTitle>
        <CardDescription className="text-white/40 text-xs">A standard Widget NFT that unlocks features, toggles services, or grants badges within SoulBridge.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Governance Voice Pass" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget NFT ID</Label>
            <Input value={form.nft_id} onChange={e => set('nft_id', e.target.value)} placeholder="e.g. WIDGET-GOV-001" className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Description *</Label>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this NFT unlock or enable?" className="bg-white/5 border-white/10 text-white min-h-[80px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget Type</Label>
            <Select value={form.widget_type} onValueChange={v => { set('widget_type', v); set('widget_class', v); }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlock">Unlock (passive)</SelectItem>
                <SelectItem value="service">Service (active/streaming)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">UI Behavior</Label>
            <Select value={form.ui_behavior} onValueChange={v => set('ui_behavior', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{UI_BEHAVIORS.map(b => <SelectItem key={b} value={b}>{b.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Feature Path</Label>
            <Input value={form.feature_path} onChange={e => set('feature_path', e.target.value)} placeholder="/my-feature" className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        {/* Economics Section */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
          <p className="text-amber-300 text-xs font-semibold">💰 NFT Economics</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Service Price (RLUSD)</Label>
              <Input type="number" value={form.service_price} onChange={e => set('service_price', e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">What users pay to acquire/use this NFT</p>
            </div>
            {form.widget_type === 'service' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-amber-300 text-xs">Stream Cost (RLUSD)</Label>
                  <Input type="number" value={form.cost_per_stream_interval} onChange={e => set('cost_per_stream_interval', e.target.value)} placeholder="0.01" className="bg-white/5 border-white/10 text-white" />
                  <p className="text-white/30 text-[9px]">Ongoing cost per interval</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-amber-300 text-xs">Stream Interval</Label>
                  <Select value={form.stream_interval_unit} onValueChange={v => set('stream_interval_unit', v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['second', 'minute', 'hour', 'day'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Image URL</Label>
            <Input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Version</Label>
            <Input value={form.version} onChange={e => set('version', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Taxon</Label>
            <Input type="number" value={form.taxon} onChange={e => set('taxon', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Transfer Fee (0-50000)</Label>
            <Input type="number" value={form.transferFee} onChange={e => set('transferFee', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.transferable} onCheckedChange={v => set('transferable', v)} />
              <Label className="text-white/50 text-[10px]">Transferable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.burnable} onCheckedChange={v => set('burnable', v)} />
              <Label className="text-white/50 text-[10px]">Burnable</Label>
            </div>
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.description || mutation.isPending || !canAfford} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Create Widget NFT — {cost} RLUSD
        </Button>
      </CardContent>
    </Card>
        );
      }}
    </WorkshopBalanceGate>
  );
}