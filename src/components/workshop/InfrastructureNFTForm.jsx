import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import WorkshopBalanceGate from './WorkshopBalanceGate';
import MetadataJsonEditor from './MetadataJsonEditor';
import FeaturePathBuilder from './FeaturePathBuilder';
import ServiceDefinitionLinker from './ServiceDefinitionLinker';
import { METADATA_STANDARD_VERSION } from '@/lib/nftMetadataSchemas';

const INFRA_CATEGORIES = ['agent_creation', 'governance', 'wallet_management', 'did_management', 'environment', 'training'];
const UI_BEHAVIORS = ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'];
const WIDGET_TYPES = ['unlock', 'service'];

const IMMUTABLE_FIELDS = [
  'name', 'description', 'category', 'widget_type', 'widget_class',
  'transferable', 'burnable', 'taxon', 'transfer_fee', 'feature_path',
];

export default function InfrastructureNFTForm() {
  const [form, setForm] = useState({
    name: '', description: '', category: 'governance',
    nftId: '', nftCost: '', fixedPrice: '', streamCost: '', streamUnit: 'day',
    serviceFeePercent: '',
    imageUrl: '', taxon: '0', transferFee: '0',
    featurePath: '', uiBehavior: 'unlock_page', widgetType: 'unlock',
    serviceLink: null,
  });
  const [customData, setCustomData] = useState({
    category: 'governance', widget_type: 'unlock', ui_behavior: 'unlock_page',
    feature_path: '', nft_cost_rlusd: 0, service_fee_percent: 0,
    pricing: { fixed_price_rlusd: 0, stream_cost_rlusd: 0, stream_interval: 'day' },
    immutable_after_mint: IMMUTABLE_FIELDS,
  });
  const queryClient = useQueryClient();
  const [uploadingImage, setUploadingImage] = useState(false);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Sync form → custom_data
  useEffect(() => {
    setCustomData({
      category: form.category,
      widget_type: form.widgetType,
      ui_behavior: form.uiBehavior,
      feature_path: form.featurePath,
      nft_cost_rlusd: parseFloat(form.nftCost) || 0,
      service_fee_percent: parseFloat(form.serviceFeePercent) || 0,
      pricing: {
        fixed_price_rlusd: parseFloat(form.fixedPrice) || 0,
        stream_cost_rlusd: parseFloat(form.streamCost) || 0,
        stream_interval: form.streamUnit,
      },
      immutable_after_mint: IMMUTABLE_FIELDS,
    });
  }, [form.category, form.widgetType, form.uiBehavior, form.featurePath, form.nftCost, form.serviceFeePercent, form.fixedPrice, form.streamCost, form.streamUnit]);

  // Sync custom_data → form (from JSON editor)
  const handleCustomDataChange = (newData) => {
    setCustomData(newData);
    if (newData.category) set('category', newData.category);
    if (newData.widget_type) set('widgetType', newData.widget_type);
    if (newData.ui_behavior) set('uiBehavior', newData.ui_behavior);
    if (newData.feature_path !== undefined) set('featurePath', newData.feature_path);
    if (newData.nft_cost_rlusd !== undefined) set('nftCost', String(newData.nft_cost_rlusd || ''));
    if (newData.service_fee_percent !== undefined) set('serviceFeePercent', String(newData.service_fee_percent || ''));
    if (newData.pricing) {
      if (newData.pricing.fixed_price_rlusd !== undefined) set('fixedPrice', String(newData.pricing.fixed_price_rlusd || ''));
      if (newData.pricing.stream_cost_rlusd !== undefined) set('streamCost', String(newData.pricing.stream_cost_rlusd || ''));
      if (newData.pricing.stream_interval) set('streamUnit', newData.pricing.stream_interval);
    }
  };

  const refreshPricingRef = React.useRef(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const fixedPrice = parseFloat(form.fixedPrice) || 0;
      const res = await base44.functions.invoke('workshopNFTCreate', {
        action: 'create',
        nft_type: 'infrastructure',
        custom_data: customData,
        metadata_standard_version: METADATA_STANDARD_VERSION,
        service_definition: form.serviceLink || undefined,
        widget_data: {
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
          transferable: false,
          burnable: false,
          taxon: parseInt(form.taxon) || 0,
          transfer_fee: parseInt(form.transferFee) || 0,
          cost_per_stream_interval: parseFloat(form.streamCost) || 0,
          stream_interval_unit: form.streamUnit,
          immutable_after_mint: IMMUTABLE_FIELDS,
          governance_notes: `Infrastructure NFT — NFT cost: ${parseFloat(form.nftCost) || 0} RLUSD, service price: ${fixedPrice} RLUSD, service fee: ${parseFloat(form.serviceFeePercent) || 0}% → Treasury, stream: ${parseFloat(form.streamCost) || 0} RLUSD/${form.streamUnit}. Immutable after mint.`,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Infrastructure NFT created as draft (immutable after mint)');
      setForm({ name: '', description: '', category: 'governance', nftId: '', nftCost: '', fixedPrice: '', streamCost: '', streamUnit: 'day', serviceFeePercent: '', imageUrl: '', taxon: '0', transferFee: '0', featurePath: '', uiBehavior: 'unlock_page', widgetType: 'unlock', serviceLink: null });
      setCustomData({ category: 'governance', widget_type: 'unlock', ui_behavior: 'unlock_page', feature_path: '', nft_cost_rlusd: 0, service_fee_percent: 0, pricing: { fixed_price_rlusd: 0, stream_cost_rlusd: 0, stream_interval: 'day' }, immutable_after_mint: IMMUTABLE_FIELDS });
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      refreshPricingRef.current?.();
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error?.message || 'Failed to create NFT';
      toast.error(msg);
      console.error('[InfrastructureNFTForm] Create failed:', msg);
    },
  });

  return (
    <WorkshopBalanceGate nftType="infrastructure">
      {({ canAfford, cost, refreshPricing: rp }) => {
        refreshPricingRef.current = rp;
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

        {/* Economics Section */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
          <p className="text-amber-300 text-xs font-semibold">💰 NFT Economics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-red-300 text-xs">Cost of NFT (RLUSD) *</Label>
              <Input type="number" value={form.nftCost} onChange={e => set('nftCost', e.target.value)} placeholder="60" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">One-time price users pay to own this NFT</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Service Price (RLUSD)</Label>
              <Input type="number" value={form.fixedPrice} onChange={e => set('fixedPrice', e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
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
              <p className="text-white/30 text-[9px]">Ongoing cost per interval (0 = no streaming)</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <Label className="text-white/60 text-xs">Image</Label>
          <div className="flex items-center gap-2">
            <Input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="Paste URL or upload →" className="bg-white/5 border-white/10 text-white flex-1" />
            <label className="flex-shrink-0 cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingImage(true);
                try {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  set('imageUrl', file_url);
                  toast.success('Image uploaded');
                } catch (err) {
                  toast.error('Upload failed: ' + (err.message || 'Unknown error'));
                } finally {
                  setUploadingImage(false);
                }
              }} />
              <div className={`h-9 w-9 rounded-md border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition ${uploadingImage ? 'opacity-50' : ''}`}>
                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white/40" />}
              </div>
            </label>
          </div>
          {form.imageUrl && (
            <div className="flex items-center gap-2 mt-1">
              <img src={form.imageUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-white/10" onError={e => { e.target.style.display = 'none'; }} />
              <span className="text-white/30 text-[9px] truncate flex-1">{form.imageUrl.slice(0, 50)}…</span>
            </div>
          )}
        </div>

        {/* Dynamic Metadata JSON Editor */}
        <MetadataJsonEditor
          nftType="infrastructure"
          customData={customData}
          onCustomDataChange={handleCustomDataChange}
          commonFields={{
            name: form.name, description: form.description, nft_id: form.nftId,
            image_url: form.imageUrl, version: '1.0.0',
            taxon: parseInt(form.taxon) || 0, transfer_fee: parseInt(form.transferFee) || 0,
            transferable: false, burnable: false,
          }}
        />

        <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.description || mutation.isPending || !canAfford} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 w-full sm:w-auto">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Create Infrastructure NFT — {cost} RLUSD
        </Button>
      </CardContent>
    </Card>
        );
      }}
    </WorkshopBalanceGate>
  );
}