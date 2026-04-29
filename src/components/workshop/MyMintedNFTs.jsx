import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Sparkles, Chrome, Bot, Shield } from 'lucide-react';
import NFTCard from './NFTCard';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: Layers },
  { key: 'chrome_skill', label: 'Chrome', icon: Chrome },
  { key: 'widget', label: 'Widget', icon: Sparkles },
  { key: 'agent', label: 'Agent', icon: Bot },
  { key: 'infrastructure', label: 'Infra', icon: Shield },
];

function getType(w) {
  if (w.chrome_skill_instructions?.length) return 'chrome_skill';
  if (w.category === 'agent_creation') return 'agent';
  if (w.immutable_after_mint?.length > 5) return 'infrastructure';
  return 'widget';
}

export default function MyMintedNFTs() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('all');

  const handleDelete = async (e, widget) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${widget.name}"? This cannot be undone.`)) return;
    setDeleting(widget.id);
    await base44.entities.Widget.delete(widget.id);
    queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
    setDeleting(null);
  };

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ['myMintedNFTs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const isAdmin = user?.role === 'admin';
      if (isAdmin) {
        return base44.entities.Widget.list('-created_date', 100);
      }
      const [byMinter, byCreator] = await Promise.all([
        base44.entities.Widget.filter({ minted_by: user.email }, '-created_date', 50),
        base44.entities.Widget.filter({ creator_id: user.email }, '-created_date', 50),
      ]);
      const seen = new Set();
      const merged = [];
      for (const w of [...byMinter, ...byCreator]) {
        if (!seen.has(w.id)) { seen.add(w.id); merged.push(w); }
      }
      return merged;
    },
    staleTime: 10000,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!widgets.length) return null;

  // Count by type
  const counts = { all: widgets.length };
  widgets.forEach(w => {
    const t = getType(w);
    counts[t] = (counts[t] || 0) + 1;
  });

  const filtered = filter === 'all' ? widgets : widgets.filter(w => getType(w) === filter);

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4 text-purple-400" /> My NFT Creations
          <Badge variant="outline" className="text-white/40 border-white/10 text-[10px] ml-auto">{widgets.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => {
            const count = counts[tab.key] || 0;
            if (tab.key !== 'all' && count === 0) return null;
            const TabIcon = tab.icon;
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/5 border border-transparent'
                }`}
              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
                <span className={`ml-0.5 text-[8px] ${isActive ? 'text-white/60' : 'text-white/20'}`}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(w => (
            <NFTCard
              key={w.id}
              widget={w}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-white/20 text-xs py-6">No {filter.replace(/_/g, ' ')} NFTs found</p>
        )}
      </CardContent>
    </Card>
  );
}