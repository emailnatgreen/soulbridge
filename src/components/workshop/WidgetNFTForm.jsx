import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Upload, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Settings2, Image, Info } from 'lucide-react';
import { toast } from 'sonner';
import WorkshopBalanceGate from './WorkshopBalanceGate';
import MetadataJsonEditor from './MetadataJsonEditor';
import FeaturePathBuilder from './FeaturePathBuilder';
import ServiceDefinitionLinker from './ServiceDefinitionLinker';
import WidgetNFTConfirmDialog from './WidgetNFTConfirmDialog';
import { METADATA_STANDARD_VERSION, getDefaultCustomData } from '@/lib/nftMetadataSchemas';

const CATEGORIES = [
  { value: 'governance', label: 'Governance', desc: 'Voting rights, proposal creation, constitutional access' },
  { value: 'skill', label: 'Skill', desc: 'Training modules, skill certifications, learning paths' },
  { value: 'agent_creation', label: 'Agent Creation', desc: 'Passes to create or manage AI agents' },
  { value: 'environment', label: 'Environment', desc: 'Village locations, spaces, and environmental features' },
  { value: 'training', label: 'Training', desc: 'Training programmes and educational resources' },
  { value: 'wallet_management', label: 'Wallet Management', desc: 'XRPL wallet tools, trustlines, payments' },
  { value: 'did_management', label: 'DID Management', desc: 'Decentralised identity management tools' },
  { value: 'other', label: 'Other', desc: 'General-purpose widgets and utilities' },
];

const UI_BEHAVIORS = [
  { value: 'unlock_page', label: 'Unlock Page', desc: 'Grants access to a specific page or route' },
  { value: 'toggle', label: 'Toggle', desc: 'Enables/disables a feature on the user dashboard' },
  { value: 'activate_feature', label: 'Activate Feature', desc: 'Activates a backend service or streaming feature' },
  { value: 'upgrade', label: 'Upgrade', desc: 'Upgrades user tier or permissions' },
  { value: 'badge', label: 'Badge', desc: 'Visual badge displayed on profile or dashboard' },
];

const INITIAL = {
  name: '', description: '', image_url: '', category: 'other',
  widget_type: 'unlock', widget_class: 'unlock', ui_behavior: 'unlock_page',
  version: '1.0.0', feature_path: '', nft_id: '',
  nft_cost: '', service_price: '', service_fee_percent: '',
  cost_per_stream_interval: '', stream_interval_unit: 'hour',
  taxon: '0', transferFee: '0', transferable: false, burnable: false,
  service_definition_link: null,
};

export default function WidgetNFTForm() {
  const [form, setForm] = useState(INITIAL);
  const [customData, setCustomData] = useState(getDefaultCustomData('widget'));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const queryClient = useQueryClient();
  const refreshPricingRef = React.useRef(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Check for duplicate NFT IDs
  const { data: existingWidgets = [] } = useQuery({
    queryKey: ['existingWidgetIds'],
    queryFn: () => base44.entities.Widget.list('-created_date', 500),
    staleTime: 30000,
  });
  const nftIdTaken = form.nft_id && existingWidgets.some(w => w.nft_id === form.nft_id);

  // Sync form fields → custom_data
  const syncFormToCustomData = useCallback(() => {
    setCustomData({
      category: form.category,
      widget_type: form.widget_type,
      ui_behavior: form.ui_behavior,
      feature_path: form.feature_path,
      nft_cost_rlusd: parseFloat(form.nft_cost) || 0,
      service_fee_percent: parseFloat(form.service_fee_percent) || 0,
      pricing: {
        service_price_rlusd: parseFloat(form.service_price) || 0,
        stream_cost_rlusd: parseFloat(form.cost_per_stream_interval) || 0,
        stream_interval: form.stream_interval_unit,
      },
    });
  }, [form.category, form.widget_type, form.ui_behavior, form.feature_path, form.nft_cost, form.service_fee_percent, form.service_price, form.cost_per_stream_interval, form.stream_interval_unit]);

  // Sync custom_data → form fields (when JSON editor changes)
  const handleCustomDataChange = (newData) => {
    setCustomData(newData);
    if (newData.category) set('category', newData.category);
    if (newData.widget_type) { set('widget_type', newData.widget_type); set('widget_class', newData.widget_type); }
    if (newData.ui_behavior) set('ui_behavior', newData.ui_behavior);
    if (newData.feature_path !== undefined) set('feature_path', newData.feature_path);
    if (newData.nft_cost_rlusd !== undefined) set('nft_cost', String(newData.nft_cost_rlusd || ''));
    if (newData.service_fee_percent !== undefined) set('service_fee_percent', String(newData.service_fee_percent || ''));
    if (newData.pricing) {
      if (newData.pricing.service_price_rlusd !== undefined) set('service_price', String(newData.pricing.service_price_rlusd || ''));
      if (newData.pricing.stream_cost_rlusd !== undefined) set('cost_per_stream_interval', String(newData.pricing.stream_cost_rlusd || ''));
      if (newData.pricing.stream_interval) set('stream_interval_unit', newData.pricing.stream_interval);
    }
  };

  React.useEffect(() => { syncFormToCustomData(); }, [syncFormToCustomData]);

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('image_url', file_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Validation
  const validate = () => {
    const errors = [];
    if (!form.name.trim()) errors.push('Name is required');
    if (!form.description.trim()) errors.push('Description is required');
    if (nftIdTaken) errors.push(`NFT ID "${form.nft_id}" is already in use`);
    if (form.nft_id && !/^WIDGET-[A-Z]{2,4}-\d{3,6}$/.test(form.nft_id)) {
      errors.push('NFT ID must match pattern WIDGET-XX-NNN (e.g. WIDGET-GOV-001)');
    }
    if (form.widget_type === 'unlock' && !form.feature_path) {
      errors.push('Feature Path is required for Unlock widgets');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

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
        custom_data: customData,
        metadata_standard_version: METADATA_STANDARD_VERSION,
        service_definition: form.service_definition_link || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Widget NFT created as draft');
      setForm(INITIAL);
      setCustomData(getDefaultCustomData('widget'));
      setValidationErrors([]);
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['existingWidgetIds'] });
      refreshPricingRef.current?.();
    },
    onError: (error) => {
      const msg = error?.response?.data?.error || error?.message || 'Failed to create Widget NFT';
      toast.error(msg);
    },
  });

  const handleSubmitClick = (canAfford) => {
    if (!validate()) return;
    if (!canAfford) {
      toast.error('Insufficient RLUSD balance');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    mutation.mutate();
  };

  const selectedCategory = CATEGORIES.find(c => c.value === form.category);
  const selectedBehavior = UI_BEHAVIORS.find(b => b.value === form.ui_behavior);

  return (
    <WorkshopBalanceGate nftType="widget">
      {({ canAfford, cost, refreshPricing: rp }) => {
        refreshPricingRef.current = rp;
        return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-purple-400" /> Create Widget NFT
        </CardTitle>
        <CardDescription className="text-white/40 text-xs">
          Design a widget that unlocks features, toggles services, or grants badges within SoulBridge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <p className="text-red-300 text-xs font-semibold">Please fix the following</p>
            </div>
            {validationErrors.map((err, i) => (
              <p key={i} className="text-red-200/70 text-[10px] ml-5">• {err}</p>
            ))}
          </div>
        )}

        {/* ─── SECTION 1: Identity ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-300 font-bold">1</div>
            <p className="text-white/70 text-xs font-semibold">Identity</p>
            <p className="text-white/30 text-[10px]">— Name, ID, and description</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Widget Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Governance Voice Pass" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/25 text-[9px]">A clear, human-readable name for your widget</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Widget NFT ID</Label>
              <Input value={form.nft_id} onChange={e => set('nft_id', e.target.value)} placeholder="e.g. WIDGET-GOV-001" className={`bg-white/5 border-white/10 text-white ${nftIdTaken ? 'border-red-500/50' : ''}`} />
              {nftIdTaken && (
                <p className="text-red-400 text-[9px] flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> This ID is already in use</p>
              )}
              {form.nft_id && !nftIdTaken && /^WIDGET-[A-Z]{2,4}-\d{3,6}$/.test(form.nft_id) && (
                <p className="text-green-400 text-[9px] flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Valid & available</p>
              )}
              {!form.nft_id && (
                <p className="text-white/25 text-[9px]">Format: WIDGET-XX-NNN (auto-generated if left blank)</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Description *</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this widget unlock or enable? Be specific — this is shown to users." className="bg-white/5 border-white/10 text-white min-h-[70px]" />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Image</Label>
            <div className="flex items-center gap-2">
              <Input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Paste URL or upload →" className="bg-white/5 border-white/10 text-white flex-1" />
              <label className="flex-shrink-0 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div className={`h-9 w-9 rounded-md border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition ${uploadingImage ? 'opacity-50' : ''}`}>
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white/40" />}
                </div>
              </label>
            </div>
            {form.image_url && (
              <div className="flex items-center gap-2 mt-1">
                <img src={form.image_url} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-white/10" onError={e => { e.target.style.display = 'none'; }} />
                <span className="text-white/30 text-[9px] truncate flex-1">{form.image_url.slice(0, 50)}…</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── SECTION 2: Classification ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-bold">2</div>
            <p className="text-white/70 text-xs font-semibold">Classification</p>
            <p className="text-white/30 text-[10px]">— How the widget behaves in the ecosystem</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="capitalize">{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && <p className="text-white/25 text-[9px]">{selectedCategory.desc}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Widget Type</Label>
              <Select value={form.widget_type} onValueChange={v => { set('widget_type', v); set('widget_class', v); }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlock">Unlock (passive)</SelectItem>
                  <SelectItem value="service">Service (active/streaming)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-white/25 text-[9px]">{form.widget_type === 'service' ? 'Runs a backend service with streaming fees' : 'Grants passive access to a feature or page'}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">UI Behaviour</Label>
              <Select value={form.ui_behavior} onValueChange={v => set('ui_behavior', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UI_BEHAVIORS.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      <span className="capitalize">{b.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBehavior && <p className="text-white/25 text-[9px]">{selectedBehavior.desc}</p>}
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: Feature Path ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-300 font-bold">3</div>
            <p className="text-white/70 text-xs font-semibold">Feature Path & Service</p>
            <p className="text-white/30 text-[10px]">— What this widget unlocks or powers</p>
          </div>

          <FeaturePathBuilder
            value={form.feature_path}
            onChange={v => set('feature_path', v)}
            widgetType={form.widget_type}
          />

          <ServiceDefinitionLinker
            widgetType={form.widget_type}
            nftId={form.nft_id}
            serviceId={form.service_definition_link}
            onServiceIdChange={v => set('service_definition_link', v)}
          />
        </div>

        {/* ─── SECTION 4: Economics ─── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300 font-bold">4</div>
            <p className="text-white/70 text-xs font-semibold">Economics</p>
            <p className="text-white/30 text-[10px]">— Pricing and revenue configuration</p>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-red-300 text-xs">Cost of NFT (RLUSD) *</Label>
                <Input type="number" value={form.nft_cost} onChange={e => set('nft_cost', e.target.value)} placeholder="60" className="bg-white/5 border-white/10 text-white" />
                <p className="text-white/25 text-[9px]">One-time price users pay to own this widget</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-amber-300 text-xs">Service Price (RLUSD)</Label>
                <Input type="number" value={form.service_price} onChange={e => set('service_price', e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
                <p className="text-white/25 text-[9px]">Per-use charge for the service (0 = free)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-green-300 text-xs">Service Fee % → Treasury</Label>
                <Input type="number" value={form.service_fee_percent} onChange={e => set('service_fee_percent', e.target.value)} placeholder="1" min="0" max="100" step="0.1" className="bg-white/5 border-white/10 text-white" />
                <p className="text-white/25 text-[9px]">% of each transaction sent to Village Treasury</p>
              </div>
              {form.widget_type === 'service' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-amber-300 text-xs">Stream Cost (RLUSD)</Label>
                    <Input type="number" value={form.cost_per_stream_interval} onChange={e => set('cost_per_stream_interval', e.target.value)} placeholder="0.01" className="bg-white/5 border-white/10 text-white" />
                    <p className="text-white/25 text-[9px]">Ongoing cost per streaming interval</p>
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
        </div>

        {/* ─── SECTION 5: Advanced (Collapsible) ─── */}
        <div className="space-y-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-slate-500/20 flex items-center justify-center text-[10px] text-slate-300 font-bold">5</div>
            <Settings2 className="w-3.5 h-3.5" />
            <p className="text-xs font-semibold">Advanced Settings</p>
            {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {!showAdvanced && <span className="text-[9px] text-white/20">Taxon, transfer rules, version…</span>}
          </button>

          {showAdvanced && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex items-start gap-2 p-2 rounded bg-blue-500/5">
                <Info className="w-3 h-3 text-blue-400/60 mt-0.5 flex-shrink-0" />
                <p className="text-white/30 text-[10px] leading-relaxed">
                  These are XRPL-level settings. Most creators can leave them at defaults. Taxon groups widgets, transfer fee sets secondary sale royalties (0-50000 = 0%-50%), and transferable/burnable control on-chain permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Version</Label>
                  <Input value={form.version} onChange={e => set('version', e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Taxon</Label>
                  <Input type="number" value={form.taxon} onChange={e => set('taxon', e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <p className="text-white/25 text-[9px]">XRPL grouping number (default: 0)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Transfer Fee (0-50000)</Label>
                  <Input type="number" value={form.transferFee} onChange={e => set('transferFee', e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  <p className="text-white/25 text-[9px]">Secondary sale royalty (50000 = 50%)</p>
                </div>
                <div className="flex items-end gap-6 pb-1">
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
            </div>
          )}
        </div>

        {/* ─── Metadata JSON Editor ─── */}
        <MetadataJsonEditor
          nftType="widget"
          customData={customData}
          onCustomDataChange={handleCustomDataChange}
          commonFields={{
            name: form.name, description: form.description, nft_id: form.nft_id,
            image_url: form.image_url, version: form.version,
            taxon: parseInt(form.taxon) || 0, transfer_fee: parseInt(form.transferFee) || 0,
            transferable: form.transferable, burnable: form.burnable,
          }}
        />

        {/* ─── Submit ─── */}
        <Button
          onClick={() => handleSubmitClick(canAfford)}
          disabled={!form.name || !form.description || mutation.isPending || nftIdTaken}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 w-full sm:w-auto"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Create Widget NFT — {cost} RLUSD
        </Button>

        {/* Confirmation Dialog */}
        <WidgetNFTConfirmDialog
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          form={form}
          cost={cost}
          isPending={mutation.isPending}
        />
      </CardContent>
    </Card>
        );
      }}
    </WorkshopBalanceGate>
  );
}