import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ShieldCheck, Wallet, Users, ChevronRight } from 'lucide-react';

export default function DIDAgentLinkOverview({ userEmail }) {
  const { data: wallets = [] } = useQuery({
    queryKey: ['did-link-wallets', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const all = await base44.entities.Wallet.filter({ owner_id: userEmail }, '-created_date', 50);
      return all.filter(w => w.is_published);
    },
    enabled: !!userEmail,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['did-link-agents', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Agent.filter({ created_by: userEmail }, '-created_date', 50);
    },
    enabled: !!userEmail,
  });

  if (wallets.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <h3 className="text-white font-semibold text-sm">DID-Agent Links</h3>
        </div>
        <Link to="/sovereign-id" className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {wallets.map(wallet => {
        const linked = agents.filter(a => a.wallet_id === wallet.id);
        return (
          <div key={wallet.id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-white text-xs font-medium">{wallet.name || 'Wallet'}</span>
              <span className="text-white/30 text-[10px] font-mono truncate flex-1">{wallet.classic_address}</span>
              <span className="text-blue-300 text-[10px]">{wallet.balance?.toFixed(2) || '0'} XRP</span>
            </div>
            {linked.length > 0 ? (
              <div className="pl-5 space-y-1">
                {linked.map(agent => (
                  <Link key={agent.id} to={`/agents/${agent.id}`}
                    className="flex items-center gap-2 text-[10px] hover:text-purple-300 transition-colors text-white/60">
                    <Users className="w-2.5 h-2.5" />
                    <span>{agent.name}</span>
                    <span className={`px-1 py-0 rounded text-[8px] ${agent.is_serving ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-400'}`}>
                      {agent.is_serving ? 'Serving' : 'Dormant'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-[10px] pl-5">No agents linked to this wallet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}