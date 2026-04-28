import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Link2, Info } from 'lucide-react';

// Known app routes creators can target
const KNOWN_PATHS = [
  { value: '/home', label: 'Home Dashboard' },
  { value: '/agents', label: 'Agents Hub' },
  { value: '/governance', label: 'Governance Hub' },
  { value: '/wallets', label: 'Wallets' },
  { value: '/marketplace', label: 'Marketplace' },
  { value: '/skills', label: 'Skills Hub' },
  { value: '/leaderboard', label: 'Leaderboard' },
  { value: '/calendar', label: 'Village Calendar' },
  { value: '/memory-browser', label: 'Memory Browser' },
  { value: '/storefront', label: 'Storefront Hub' },
  { value: '/widget-marketplace', label: 'Widget Marketplace' },
  { value: '/did-manager', label: 'DID Manager' },
  { value: '/sovereign-id', label: 'Sovereign ID' },
  { value: '/training', label: 'Skill Development' },
  { value: '/nft-workshop', label: 'NFT Workshop' },
  { value: '/send', label: 'Send RLUSD' },
  { value: '/rlusd-gate', label: 'RLUSD Trustline Gate' },
  { value: '/service-definitions', label: 'Service Definitions' },
  { value: '/agent-genesis', label: 'Agent Genesis' },
  { value: 'custom', label: '✏️ Custom Path…' },
];

export default function FeaturePathBuilder({ value, onChange, widgetType }) {
  const [mode, setMode] = useState(
    value && KNOWN_PATHS.some(p => p.value === value) ? 'preset' : value ? 'custom' : 'preset'
  );

  const isUnlock = widgetType === 'unlock';

  const handleSelect = (selected) => {
    if (selected === 'custom') {
      setMode('custom');
      onChange('');
    } else {
      setMode('preset');
      onChange(selected);
    }
  };

  return (
    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-blue-400" />
        <Label className="text-blue-300 text-xs font-semibold">
          Feature Path Builder
        </Label>
        {isUnlock && (
          <span className="ml-auto text-[9px] text-blue-400/60 bg-blue-500/10 px-2 py-0.5 rounded-full">
            Required for Unlock NFTs
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 p-2 rounded bg-blue-500/5">
        <Info className="w-3 h-3 text-blue-400/60 mt-0.5 flex-shrink-0" />
        <p className="text-white/40 text-[10px] leading-relaxed">
          {isUnlock
            ? 'This path defines the page or feature your NFT will unlock. Users who own this NFT will gain access to the specified route.'
            : 'Optional for Service NFTs. If set, this path provides a landing page for the service. The core functionality is defined via the Service Definition below.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-white/50 text-[10px]">Select a Page</Label>
          <Select
            value={mode === 'preset' ? (value || '') : 'custom'}
            onValueChange={handleSelect}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
              <SelectValue placeholder="Choose a page…" />
            </SelectTrigger>
            <SelectContent>
              {KNOWN_PATHS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === 'custom' && (
          <div className="space-y-1.5">
            <Label className="text-white/50 text-[10px]">Custom Path</Label>
            <div className="flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-white/30 flex-shrink-0" />
              <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="/my-custom-feature"
                className="bg-white/5 border-white/10 text-white text-xs"
              />
            </div>
            <p className="text-white/30 text-[9px]">Enter a custom route path (e.g. /my-gallery)</p>
          </div>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 border border-white/10">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-300 text-[10px] font-mono">{value}</span>
          <span className="text-white/30 text-[9px] ml-auto">Active path</span>
        </div>
      )}
    </div>
  );
}