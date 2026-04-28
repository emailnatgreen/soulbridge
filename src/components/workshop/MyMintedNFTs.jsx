import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Sparkles, Chrome, Bot, Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import MintActionButton from './MintActionButton';

const STATUS_COLORS = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  prepared: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  simulated: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  minted_mainnet: 'bg-green-500/20 text-green-300 border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function getTypeIcon(widget) {
  if (widget.chrome_skill_instructions?.length) return <Chrome className="w-3.5 h-3.5 text-emerald-400" />;
  if (widget.category === 'agent_creation') return <Bot className="w-3.5 h-3.5 text-amber-400" />;
  if (widget.immutable_after_mint?.length) return <Shield className="w-3.5 h-3.5 text-red-400" />;
  return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
}

function getTypeLabel(widget) {
  if (widget.chrome_skill_instructions?.length) return 'Chrome Skill';
  if (widget.category === 'agent_creation') return 'Agent NFT';
  if (widget.immutable_after_mint?.length) return 'Infrastructure';
  return 'Widget';
}

export default function MyMintedNFTs() {
  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ['myMintedNFTs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const [byMinter, byCreator, byBuiltIn] = await Promise.all([
        base44.entities.Widget.filter({ minted_by: user.email }, '-created_date', 50),
        base44.entities.Widget.filter({ creator_id: user.email }, '-created_date', 50),
        base44.entities.Widget.filter({ created_by: user.email }, '-created_date', 50),
      ]);
      // Merge and deduplicate
      const seen = new Set();
      const merged = [];
      for (const w of [...byMinter, ...byCreator, ...byBuiltIn]) {
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
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
        </CardContent>
      </Card>
    );
  }

  if (!widgets.length) return null;

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4 text-purple-400" /> My NFT Creations
          <Badge variant="outline" className="text-white/40 border-white/10 text-[10px] ml-auto">{widgets.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {widgets.map(w => (
          <Link key={w.id} to={`/widget-marketplace/${w.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
            {w.image_url ? (
              <img src={w.image_url} alt={w.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                {getTypeIcon(w)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{w.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-white/30 text-[9px]">{getTypeLabel(w)}</span>
                <span className="text-white/15">·</span>
                <span className="text-white/30 text-[9px]">{w.category?.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-[9px] ${STATUS_COLORS[w.mint_status] || STATUS_COLORS.draft}`}>
                {w.mint_status?.replace(/_/g, ' ') || 'draft'}
              </Badge>
              {w.xrpl_tx_hash && (
                <a
                  href={`https://xrpscan.com/tx/${w.xrpl_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[9px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-0.5 transition-colors"
                  title="Verify on XRPScan"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> XRPScan
                </a>
              )}
              <MintActionButton widget={w} />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}