import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Zap, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * A simple informational card introducing the Kinetic Weaver agent.
 * Shown on KU-related public pages in place of discussion features.
 */
export default function KineticWeaverCard() {
  const { data: agents = [] } = useQuery({
    queryKey: ['kinetic-weaver-card'],
    queryFn: () => base44.entities.Agent.filter({ name: 'Kinetic Weaver' }, '-created_date', 1),
  });

  const kw = agents[0];

  return (
    <div className="mt-10 max-w-sm mx-auto">
      <p className="text-xs text-slate-500 text-center uppercase tracking-widest mb-3">Your Kinetic Guide</p>
      <div className="bg-white/[0.04] border border-yellow-500/20 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            {kw?.avatar_url ? (
              <img src={kw.avatar_url} alt="Kinetic Weaver" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Zap className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold">{kw?.name || 'Kinetic Weaver'}</h3>
            <p className="text-yellow-400 text-xs">{kw?.role || 'creator'} · Village Agent</p>
            {kw?.classic_address && (
              <p className="text-slate-500 text-[10px] font-mono truncate" title={kw.classic_address}>
                DID: {kw.classic_address.slice(0, 20)}…
              </p>
            )}
          </div>
        </div>

        <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-3">
          {kw?.purpose || 'I interpret and articulate the energy of the Village — translating Kinetic Units into meaning, helping every Soul understand the living pulse of SoulBridge.'}
        </p>

        {kw?.tagline && (
          <p className="text-yellow-300/60 text-xs italic mb-4">"{kw.tagline}"</p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 mb-4 border-t border-white/5 pt-3">
          <span>Honor</span>
          <span className="text-green-400 font-semibold">{kw?.honor_score ?? 100}</span>
        </div>

        {kw && (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border border-yellow-500/30 text-yellow-300 hover:from-yellow-600/50 hover:to-orange-600/50"
            onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-agent', { detail: { agentId: kw.id, message: `I'd like to speak with the Kinetic Weaver about the Kinetic Grid.` } }))}
          >
            <MessageCircle className="w-3 h-3 mr-2" />
            Chat with Kinetic Weaver
          </Button>
        )}
      </div>
    </div>
  );
}