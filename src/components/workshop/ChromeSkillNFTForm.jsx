import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chrome, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import WorkshopBalanceGate from './WorkshopBalanceGate';
import MetadataJsonEditor from './MetadataJsonEditor';
import FeaturePathBuilder from './FeaturePathBuilder';
import ServiceDefinitionLinker from './ServiceDefinitionLinker';
import ChromeSkillExplainer from './ChromeSkillExplainer';
import ChromeManifestExport from './ChromeManifestExport';
import { METADATA_STANDARD_VERSION, getDefaultCustomData } from '@/lib/nftMetadataSchemas';

const EMPTY_SKILL = { skill_name: '', instructions: '', trigger_command: '', requires_didit_verification: true };

export default function ChromeSkillNFTForm() {
  const [name, setName] = useState('');
  const [nftId, setNftId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [nftCost, setNftCost] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceFeePercent, setServiceFeePercent] = useState('');
  const [streamCost, setStreamCost] = useState('');
  const [streamUnit, setStreamUnit] = useState('day');
  const [taxon, setTaxon] = useState('0');
  const [transferFee, setTransferFee] = useState('0');
  const [featurePath, setFeaturePath] = useState('');
  const [widgetType, setWidgetType] = useState('unlock');
  const [serviceLink, setServiceLink] = useState(null);
  const [skills, setSkills] = useState([{ ...EMPTY_SKILL }]);
  const [customData, setCustomData] = useState(getDefaultCustomData('chrome_skill'));
  const queryClient = useQueryClient();

  // Sync form → custom_data
  useEffect(() => {
    setCustomData({
      skills: skills.filter(s => s.skill_name || s.instructions),
      nft_cost_rlusd: parseFloat(nftCost) || 0,
      service_fee_percent: parseFloat(serviceFeePercent) || 0,
      pricing: {
        service_price_rlusd: parseFloat(servicePrice) || 0,
        stream_cost_rlusd: parseFloat(streamCost) || 0,
        stream_interval: streamUnit,
      },
    });
  }, [skills, nftCost, serviceFeePercent, servicePrice, streamCost, streamUnit]);

  // Sync custom_data → form (from JSON editor)
  const handleCustomDataChange = (newData) => {
    setCustomData(newData);
    if (Array.isArray(newData.skills)) {
      setSkills(newData.skills.length > 0 ? newData.skills : [{ ...EMPTY_SKILL }]);
    }
    if (newData.nft_cost_rlusd !== undefined) setNftCost(String(newData.nft_cost_rlusd || ''));
    if (newData.service_fee_percent !== undefined) setServiceFeePercent(String(newData.service_fee_percent || ''));
    if (newData.pricing) {
      if (newData.pricing.service_price_rlusd !== undefined) setServicePrice(String(newData.pricing.service_price_rlusd || ''));
      if (newData.pricing.stream_cost_rlusd !== undefined) setStreamCost(String(newData.pricing.stream_cost_rlusd || ''));
      if (newData.pricing.stream_interval) setStreamUnit(newData.pricing.stream_interval);
    }
  };

  const updateSkill = (idx, key, val) => {
    setSkills(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };
  const addSkill = () => setSkills(prev => [...prev, { ...EMPTY_SKILL }]);
  const removeSkill = (idx) => setSkills(prev => prev.filter((_, i) => i !== idx));

  const [refreshPricing, setRefreshPricing] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('workshopNFTCreate', {
        action: 'create',
        nft_type: 'chrome_skill',
        custom_data: customData,
        metadata_standard_version: METADATA_STANDARD_VERSION,
        service_definition: serviceLink || undefined,
        widget_data: {
          name,
          nft_id: nftId || undefined,
          description,
          image_url: imageUrl,
          widget_type: widgetType,
          widget_class: widgetType,
          category: 'skill',
          ui_behavior: 'activate_feature',
          feature_path: featurePath || undefined,
          version: '1.0.0',
          transferable: false,
          burnable: false,
          taxon: parseInt(taxon) || 0,
          transfer_fee: parseInt(transferFee) || 0,
          chrome_skill_instructions: skills.filter(s => s.skill_name && s.instructions),
          webmcp_manifest: buildWebMCPManifest(),
          cost_per_stream_interval: parseFloat(streamCost) || 0,
          stream_interval_unit: streamUnit,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Chrome Skill NFT created as draft');
      setName(''); setNftId(''); setDescription(''); setImageUrl('');
      setNftCost(''); setServicePrice(''); setServiceFeePercent('');
      setStreamCost(''); setStreamUnit('day');
      setTaxon('0'); setTransferFee('0');
      setFeaturePath(''); setWidgetType('unlock'); setServiceLink(null);
      setSkills([{ ...EMPTY_SKILL }]);
      setCustomData(getDefaultCustomData('chrome_skill'));
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      refreshPricing?.();
    },
  });

  // Build webmcp_manifest for the widget entity
  const buildWebMCPManifest = () => {
    const validSkills = skills.filter(s => s.skill_name && s.instructions);
    if (!validSkills.length) return undefined;
    return {
      version: '2026.1',
      capabilities: {
        tools: validSkills.map(s => ({
          name: s.skill_name.replace(/\s+/g, '_').toLowerCase(),
          description: `${s.trigger_command || 'manual'} — ${s.instructions.slice(0, 200)}`,
          parameters: { type: 'object', properties: { user_context: { type: 'string', description: 'Optional context' } } },
        })),
      },
    };
  };

  // Trigger command validation
  const getTriggerWarning = (cmd) => {
    if (!cmd) return null;
    if (!cmd.startsWith('/')) return 'Trigger commands should start with /';
    if (cmd.includes(' ')) return 'Trigger commands should not contain spaces';
    return null;
  };

  return (
    <WorkshopBalanceGate nftType="chrome_skill">
      {({ canAfford, cost, refreshPricing: rp }) => {
        if (!refreshPricing && rp) setRefreshPricing(() => rp);
        return (
    <div className="space-y-4">
    <ChromeSkillExplainer />
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Chrome className="w-4 h-4 text-emerald-400" /> Create Chrome Skill NFT</CardTitle>
        <CardDescription className="text-white/40 text-xs">
          Define your browser-executable AI skills below. Each skill becomes a discoverable tool in Chrome's Gemini Side Panel, minted as a sovereign NFT on the XRP Ledger.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">NFT Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Axi Pharmacy Unlock" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget NFT ID</Label>
            <Input value={nftId} onChange={e => setNftId(e.target.value)} placeholder="e.g. WIDGET-CS-001" className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Image URL</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Taxon</Label>
              <Input type="number" value={taxon} onChange={e => setTaxon(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Transfer Fee</Label>
              <Input type="number" value={transferFee} onChange={e => setTransferFee(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Description *</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What Chrome skill does this NFT unlock?" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
        </div>

        {/* Economics Section */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
          <p className="text-amber-300 text-xs font-semibold">💰 NFT Economics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-red-300 text-xs">Cost of NFT (RLUSD) *</Label>
              <Input type="number" value={nftCost} onChange={e => setNftCost(e.target.value)} placeholder="60" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">One-time price users pay to own this NFT</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Service Price (RLUSD)</Label>
              <Input type="number" value={servicePrice} onChange={e => setServicePrice(e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">Per-use charge for the service (0 = free)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-300 text-xs">Service Fee % → Treasury</Label>
              <Input type="number" value={serviceFeePercent} onChange={e => setServiceFeePercent(e.target.value)} placeholder="1" min="0" max="100" step="0.1" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">% of each transaction sent to Village Treasury (e.g. 1 = 1%)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Stream Cost (RLUSD)</Label>
              <Input type="number" value={streamCost} onChange={e => setStreamCost(e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white" />
              <p className="text-white/30 text-[9px]">Ongoing cost per interval (0 = none)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-amber-300 text-xs">Stream Interval</Label>
              <Select value={streamUnit} onValueChange={v => setStreamUnit(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['second', 'minute', 'hour', 'day'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Widget Type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Widget Type</Label>
            <Select value={widgetType} onValueChange={v => setWidgetType(v)}>
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
          value={featurePath}
          onChange={setFeaturePath}
          widgetType={widgetType}
        />

        {/* Service Definition Linker */}
        <ServiceDefinitionLinker
          widgetType={widgetType}
          nftId={nftId}
          serviceId={serviceLink}
          onServiceIdChange={setServiceLink}
        />

        {/* Skill definitions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-emerald-300 text-xs font-semibold">Chrome Skill Definitions</Label>
            <Button variant="ghost" size="sm" onClick={addSkill} className="text-emerald-400 hover:text-emerald-300 gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Add Skill
            </Button>
          </div>
          {skills.map((skill, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 text-[10px] font-mono">Skill #{idx + 1}</span>
                {skills.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeSkill(idx)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white/50 text-[10px]">Skill Name *</Label>
                  <Input value={skill.skill_name} onChange={e => updateSkill(idx, 'skill_name', e.target.value)} placeholder="e.g. Pharmacy Portal Unlock" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  <p className="text-white/20 text-[8px]">Display name shown in the Gemini Side Panel</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-[10px]">Trigger Command</Label>
                  <Input
                    value={skill.trigger_command}
                    onChange={e => {
                      let val = e.target.value;
                      if (val && !val.startsWith('/')) val = '/' + val;
                      updateSkill(idx, 'trigger_command', val);
                    }}
                    placeholder="/Axi"
                    className="bg-white/5 border-white/10 text-white text-xs h-8 font-mono"
                  />
                  {getTriggerWarning(skill.trigger_command) && (
                    <p className="text-amber-400 text-[8px] flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" /> {getTriggerWarning(skill.trigger_command)}
                    </p>
                  )}
                  <p className="text-white/20 text-[8px]">Slash command users type to activate (e.g. /Axi)</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-white/50 text-[10px]">Instructions *</Label>
                  <span className={`text-[8px] ${(skill.instructions?.length || 0) > 2000 ? 'text-red-400' : 'text-white/20'}`}>
                    {skill.instructions?.length || 0} / 2000
                  </span>
                </div>
                <Textarea
                  value={skill.instructions}
                  onChange={e => updateSkill(idx, 'instructions', e.target.value)}
                  placeholder="Step 1: Navigate to example.com/portal&#10;Step 2: Click the 'Login' button&#10;Step 3: Enter the user's stored credentials&#10;Step 4: Navigate to 'View Dashboard'&#10;&#10;If a CAPTCHA appears, pause and ask the user to complete it.&#10;Do NOT enter payment information or modify any records."
                  className="bg-white/5 border-white/10 text-white text-xs min-h-[100px]"
                  maxLength={2000}
                />
                <p className="text-white/20 text-[8px]">Step-by-step natural language instructions for the browser agent. Be specific about URLs, buttons, and boundaries.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={skill.requires_didit_verification} onCheckedChange={v => updateSkill(idx, 'requires_didit_verification', v)} />
                <Label className="text-white/50 text-[10px]">Require DIDit verification + RLUSD payment</Label>
              </div>
            </div>
          ))}
        </div>

        {/* WebMCP Manifest Export */}
        <ChromeManifestExport
          name={name}
          nftId={nftId}
          description={description}
          skills={skills}
          imageUrl={imageUrl}
        />

        {/* Dynamic Metadata JSON Editor */}
        <MetadataJsonEditor
          nftType="chrome_skill"
          customData={customData}
          onCustomDataChange={handleCustomDataChange}
          commonFields={{
            name, description, nft_id: nftId, image_url: imageUrl,
            version: '1.0.0', taxon: parseInt(taxon) || 0,
            transfer_fee: parseInt(transferFee) || 0,
            transferable: false, burnable: false,
          }}
        />

        <Button
          onClick={() => mutation.mutate()}
          disabled={!name || !description || skills.every(s => !s.skill_name || !s.instructions) || mutation.isPending || !canAfford}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 w-full sm:w-auto"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
          Create Chrome Skill NFT — {cost} RLUSD
        </Button>
      </CardContent>
    </Card>
    </div>
        );
      }}
    </WorkshopBalanceGate>
  );
}