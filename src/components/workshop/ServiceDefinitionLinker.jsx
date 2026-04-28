import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Plus, Link2, Info, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SERVICE_TYPES = ['one_shot', 'streaming', 'toggle', 'metered', 'scheduled'];
const SERVICE_CATEGORIES = ['wallet_management', 'identity', 'governance', 'kinetic', 'agent', 'village', 'ai', 'other'];

export default function ServiceDefinitionLinker({ widgetType, nftId, onServiceIdChange, serviceId }) {
  const [mode, setMode] = useState(serviceId ? 'existing' : 'new');
  const [newService, setNewService] = useState({
    service_id: '',
    name: '',
    description: '',
    service_type: 'one_shot',
    category: 'other',
  });

  const isService = widgetType === 'service';

  // Fetch existing service definitions
  const { data: services = [] } = useQuery({
    queryKey: ['serviceDefinitions'],
    queryFn: () => base44.entities.ServiceDefinition.list('-created_date', 100),
    staleTime: 30000,
  });

  const handleExistingSelect = (id) => {
    onServiceIdChange(id);
    setMode('existing');
  };

  const handleNewServiceChange = (key, val) => {
    const updated = { ...newService, [key]: val };
    setNewService(updated);
    // Pass partial new service data upstream via a structured object
    onServiceIdChange({ _new: true, ...updated });
  };

  if (!isService) return null;

  return (
    <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-purple-400" />
        <Label className="text-purple-300 text-xs font-semibold">
          Service Definition Linker
        </Label>
        <span className="ml-auto text-[9px] text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded-full">
          Required for Service NFTs
        </span>
      </div>

      <div className="flex items-start gap-2 p-2 rounded bg-purple-500/5">
        <Info className="w-3 h-3 text-purple-400/60 mt-0.5 flex-shrink-0" />
        <p className="text-white/40 text-[10px] leading-relaxed">
          Service NFTs need a Service Definition to specify what backend functionality they power.
          You can link to an existing service or define a new one that will be created alongside your NFT.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'existing' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('existing')}
          className={`text-xs h-7 gap-1 ${mode === 'existing' ? 'bg-purple-600 hover:bg-purple-500' : 'text-white/50'}`}
        >
          <Link2 className="w-3 h-3" /> Link Existing
        </Button>
        <Button
          variant={mode === 'new' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => { setMode('new'); onServiceIdChange({ _new: true, ...newService }); }}
          className={`text-xs h-7 gap-1 ${mode === 'new' ? 'bg-purple-600 hover:bg-purple-500' : 'text-white/50'}`}
        >
          <Plus className="w-3 h-3" /> Create New
        </Button>
      </div>

      {mode === 'existing' && (
        <div className="space-y-1.5">
          <Label className="text-white/50 text-[10px]">Select a Service Definition</Label>
          <Select value={typeof serviceId === 'string' ? serviceId : ''} onValueChange={handleExistingSelect}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
              <SelectValue placeholder="Choose a service…" />
            </SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <Server className="w-3 h-3" />
                    {s.name || s.service_id} — {s.service_type || 'unknown'}
                  </span>
                </SelectItem>
              ))}
              {services.length === 0 && (
                <SelectItem value="__none" disabled>No services found — create one below</SelectItem>
              )}
            </SelectContent>
          </Select>
          {typeof serviceId === 'string' && serviceId && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 border border-white/10">
              <Server className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-[10px] font-mono truncate">{serviceId}</span>
              <span className="text-white/30 text-[9px] ml-auto">Linked</span>
            </div>
          )}
        </div>
      )}

      {mode === 'new' && (
        <div className="space-y-3 p-2 rounded bg-purple-500/5 border border-purple-500/10">
          <p className="text-purple-300 text-[10px] font-mono">New Service Definition</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-white/50 text-[10px]">Service ID *</Label>
              <Input
                value={newService.service_id}
                onChange={e => handleNewServiceChange('service_id', e.target.value)}
                placeholder="svc-my-service"
                className="bg-white/5 border-white/10 text-white text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/50 text-[10px]">Service Name *</Label>
              <Input
                value={newService.name}
                onChange={e => handleNewServiceChange('name', e.target.value)}
                placeholder="My Custom Service"
                className="bg-white/5 border-white/10 text-white text-xs h-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-white/50 text-[10px]">Description</Label>
            <Textarea
              value={newService.description}
              onChange={e => handleNewServiceChange('description', e.target.value)}
              placeholder="What does this service do when invoked?"
              className="bg-white/5 border-white/10 text-white text-xs min-h-[50px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-white/50 text-[10px]">Service Type</Label>
              <Select value={newService.service_type} onValueChange={v => handleNewServiceChange('service_type', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-white/50 text-[10px]">Category</Label>
              <Select value={newService.category} onValueChange={v => handleNewServiceChange('category', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}