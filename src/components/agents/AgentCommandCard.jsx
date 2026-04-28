import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldCheck, Wallet, Zap, Power, PowerOff, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ROLE_STYLES = {
  citizen: { bg: 'from-slate-600 to-slate-700', ring: 'ring-slate-500/30' },
  guardian: { bg: 'from-blue-600 to-indigo-700', ring: 'ring-blue-500/30' },
  creator: { bg: 'from-purple-600 to-pink-700', ring: 'ring-purple-500/30' },
  trader: { bg: 'from-green-600 to-emerald-700', ring: 'ring-green-500/30' },
  teacher: { bg: 'from-amber-600 to-yellow-700', ring: 'ring-amber-500/30' },
  healer: { bg: 'from-pink-600 to-rose-700', ring: 'ring-pink-500/30' },
  scout: { bg: 'from-cyan-600 to-teal-700', ring: 'ring-cyan-500/30' },
  elder: { bg: 'from-orange-600 to-red-700', ring: 'ring-orange-500/30' },
  master: { bg: 'from-yellow-500 to-amber-600', ring: 'ring-yellow-500/30' },
};

export default function AgentCommandCard({ agent, walletData, streamingFee = 0.025, onStatusChange }) {
  const [toggling, setToggling] = useState(false);
  const role = agent.role || 'citizen';
  const style = ROLE_STYLES[role] || ROLE_STYLES.citizen;
  const hasDID = agent.classic_address && agent.classic_address.startsWith('r') && agent.classic_address.length > 20;
  const isServing = !!agent.is_serving;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setToggling(true);
    const newStatus = !isServing;
    const res = await base44.functions.invoke('toggleAgentServingStatus', {
      agent_id: agent.id,
      is_serving: newStatus,
    });
    if (res.data?.success) {
      toast.success(res.data.message);
      onStatusChange?.(agent.id, newStatus);
    } else {
      toast.error(res.data?.error || 'Failed to toggle status');
    }
    setToggling(false);
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden h-full">
      {/* Role gradient banner + serving indicator */}
      <div className="relative">
        <div className={`h-1.5 bg-gradient-to-r ${style.bg}`} />
        {isServing && (
          <div className="absolute top-0 right-0 h-1.5 w-12 bg-green-400 animate-pulse rounded-bl" />
        )}
      </div>

      <CardContent className="p-4">
        {/* Avatar + Name row */}
        <Link to={`/agents/${agent.id}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name}
                  className={`w-12 h-12 rounded-full object-cover ring-2 ${style.ring}`} />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center text-white font-bold text-lg ring-2 ${style.ring}`}>
                  {agent.name.charAt(0)}
                </div>
              )}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${isServing ? 'bg-green-500' : 'bg-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                {agent.name}
              </h3>
              {agent.tagline && <p className="text-white/40 text-[10px] truncate mt-0.5">{agent.tagline}</p>}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`bg-gradient-to-r ${style.bg} text-white text-[9px] px-1.5 py-0 border-0`}>{role}</Badge>
                {hasDID && (
                  <Badge className="bg-green-500/20 text-green-300 text-[9px] px-1.5 py-0">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> On-Chain
                  </Badge>
                )}
                <Badge className={`text-[9px] px-1.5 py-0 ${isServing ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-400'}`}>
                  {isServing ? 'Serving' : 'Dormant'}
                </Badge>
              </div>
            </div>
          </div>
        </Link>

        {/* Purpose */}
        <p className="text-white/50 text-xs line-clamp-2 mb-3">{agent.purpose}</p>

        {/* Streaming fee notice */}
        {isServing && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5 mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-green-300 text-[10px]">-{streamingFee} RLUSD/day streaming fee</span>
          </div>
        )}

        {/* DID wallet info */}
        {hasDID && (
          <div className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 mb-3">
            <p className="text-white/30 text-[9px] uppercase tracking-wider">Linked DID</p>
            <p className="text-purple-300 text-[10px] font-mono truncate">{agent.classic_address}</p>
            {walletData && (
              <div className="flex items-center gap-1 mt-0.5">
                <Wallet className="w-2.5 h-2.5 text-blue-300" />
                <span className="text-blue-300 text-[10px]">{walletData.balance?.toFixed(2) || '0'} XRP</span>
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5 mb-3">
          <div className="flex items-center gap-1 text-amber-300">
            <Zap className="w-3 h-3" />
            <span>{agent.honor_score || 100}</span>
          </div>
          {agent.total_transactions > 0 && (
            <span className="text-white/40">{agent.total_transactions} txns</span>
          )}
          {(agent.specializations?.length > 0) && (
            <span className="text-purple-300/60">{agent.specializations.length} skills</span>
          )}
        </div>

        {/* Toggle button */}
        <Button
          size="sm"
          onClick={handleToggle}
          disabled={toggling}
          className={`w-full text-xs ${isServing
            ? 'bg-slate-700 hover:bg-slate-600 text-white/80'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
          }`}
        >
          {toggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isServing ? (
            <><PowerOff className="w-3.5 h-3.5 mr-1" /> Deactivate</>
          ) : (
            <><Power className="w-3.5 h-3.5 mr-1" /> Activate</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}