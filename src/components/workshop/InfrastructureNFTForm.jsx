import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const INFRA_CATEGORIES = ['governance', 'wallet_management', 'did_management', 'environment', 'training'];
const UI_BEHAVIORS = ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'];
const WIDGET_TYPES = ['unlock', 'service'];

const IMMUTABLE_FIELDS = [
  'name', 'description', 'category', 'widget_type', 'widget_class',
  'transferable', 'burnable', 'taxon', 'transfer_fee', 'feature_path',
];

export default function InfrastructureNFTForm() {
  const [form, setForm] = useState({
    name: '', description: '', category: 'governance',
    nftId: '', fixedPrice: '', imageUrl: '', taxon: '0', transferFee: '0',
    featurePath: '', uiBehavior: 'unlock_page', widgetType: 'unlock',
  });
  const queryClient = useQueryClient();
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const fixedPrice = parseFloat(form.fixedPrice) || 0;
      return base44.entities.Widget.create({
        name: form.name,
        nft_id: form.nftId || undefined,
        description: form.description,
        widget_type: form.widgetType,
        widget_class: form.widgetType,
        category: form.category,
        ui_behavior: form.uiBehavior,
        feature_path: form.featurePath || undefined,
        version: '1.0.0',
        image_url: form.imageUrl,
        minted_by: user.email,
        creator_id: user.email,
        mint_status: 'draft',
        metadata_version: '1.0.0',
        transferable: false,
        burnable: false,
        taxon: parseInt(form.taxon) || 0,
        transfer_fee: parseInt(form.transferFee) || 0,
        cost_per_stream_interval: fixedPrice,
        stream_interval_unit: 'day',
        immutable_after_mint: IMMUTABLE_FIELDS,
        governance_notes: `Infrastructure NFT — fixed price cap: ${fixedPrice} RLUSD. Immutable after mint.`,
      });
    },
    onSuccess: () => {
      toast.success('Infrastructure NFT created as draft (immutable after mint)');
      setForm({ name: '', description: '', category: 'governance', nftId: '', fixedPrice: '', imageUrl: '', taxon: '0', transferFee: '0', featurePath: '', uiBehavior: 'unlock_page', widgetType: 'unlock' });
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4 text-red-400" /> Create Infrastructure NFT</CardTitle>
        <CardDescription className="text-white/40 text-xs">
          Admin-only. Infrastructure NFTs are hard-coded as immutable after minting with enforced price caps to prevent market inflation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-300 text-xs font-semibold">Immutable After Mint</p>
            <p className="text-red-200/60 text-[10px] leading-relaxed">
              These fields become permanently locked once minted on XRPL mainnet: {IMMUTABLE_FIELDS.join(', ')}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Village Treasury Core" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget NFT ID *</Label>
            <Input value={form.nftId} onChange={e => set('nftId', e.target.value)} placeholder="e.g. WIDGET-WM-007" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{INFRA_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Description *</Label>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What platform infrastructure does this NFT represent?" className="bg-white/5 border-white/10 text-white min-h-[80px]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget Type</Label>
            <Select value={form.widgetType} onValueChange={v => set('widgetType', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'unlock' ? 'Unlock (passive)' : 'Service (active/streaming)'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">UI Behavior</Label>
            <Select value={form.uiBehavior} onValueChange={v => set('uiBehavior', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{UI_BEHAVIORS.map(b => <SelectItem key={b} value={b}>{b.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Feature Path</Label>
            <Input value={form.featurePath} onChange={e => set('featurePath', e.target.value)} placeholder="/did-manager" className="bg-white/5 border-white/10 text-white" />
            <p className="text-white/30 text-[9px]">The page or feature this NFT unlocks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-red-300 text-xs">Fixed Price Cap (RLUSD) *</Label>
            <Input type="number" value={form.fixedPrice} onChange={e => set('fixedPrice', e.target.value)} placeholder="100" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Taxon</Label>
            <Input type="number" value={form.taxon} onChange={e => set('taxon', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Transfer Fee (0-50000)</Label>
            <Input type="number" value={form.transferFee} onChange={e => set('transferFee', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Image URL</Label>
          <Input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
        </div>

        <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.description || !form.fixedPrice || mutation.isPending} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Create Infrastructure NFT Draft
        </Button>
      </CardContent>
    </Card>
  );
}