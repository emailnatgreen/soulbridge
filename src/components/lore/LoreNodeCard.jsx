import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicAgentChatModal from '@/components/PublicAgentChatModal';

const FALLBACK_LN = {
  name: 'Lore Node',
  role: 'elder',
  purpose: 'I am the living memory of SoulBridge — keeper of the 11 Laws of Honour, narrator of Village history, and guide to the constitutional foundations that bind every Soul.',
  honor_score: 100,
};

export default function LoreNodeCard() {
  const [showChat, setShowChat] = useState(false);
  const { data: agents = [] } = useQuery({
    queryKey: ['lore-node-card'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('publicPageData', { page: 'landing' });
        const all = res?.data?.agents || [];
        return all.filter(a => a.name === 'Lore Node');
      } catch (_) {
        return [];
      }
    },
    retry: false,
  });

  const ln = agents[0] || FALLBACK_LN;

  return (
    <div className="bg-white/[0.04] border border-purple-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          {ln?.avatar_url ? (
            <img src={ln.avatar_url} alt="Lore Node" className="w-full h-full rounded-full object-cover" />
          ) : (
            <BookOpen className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold">{ln?.name || 'Lore Node'}</h3>
          <p className="text-purple-400 text-xs">{ln?.role || 'elder'} · Village Agent</p>
          {ln?.classic_address && (
            <p className="text-slate-500 text-[10px] font-mono truncate" title={ln.classic_address}>
              DID: {ln.classic_address.slice(0, 20)}…
            </p>
          )}
        </div>
      </div>

      <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-3">
        {ln?.purpose || FALLBACK_LN.purpose}
      </p>

      {ln?.tagline && (
        <p className="text-purple-300/60 text-xs italic mb-4">"{ln.tagline}"</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 border-t border-white/5 pt-3">
        <span>Honor</span>
        <span className="text-green-400 font-semibold">{ln?.honor_score ?? 100}</span>
      </div>

      <Button
        size="sm"
        className="w-full bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 text-purple-300 hover:from-purple-600/50 hover:to-pink-600/50"
        onClick={() => setShowChat(true)}
      >
        <MessageCircle className="w-3 h-3 mr-2" />
        Ask the Lore Node
      </Button>

      {showChat && (
        <PublicAgentChatModal agent={ln} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}