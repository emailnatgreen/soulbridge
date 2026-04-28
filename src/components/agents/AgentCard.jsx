import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck, Wallet, Zap, MessageSquare } from 'lucide-react';

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

const STATUS_COLORS = {
  active: 'bg-green-500',
  dormant: 'bg-slate-500',
  suspended: 'bg-red-500',
  probation: 'bg-amber-500',
};

export default function AgentCard({ agent, walletData }) {
  const role = agent.role || 'citizen';
  const style = ROLE_STYLES[role] || ROLE_STYLES.citizen;
  const hasDID = agent.classic_address && agent.classic_address.startsWith('r') && agent.classic_address.length > 20;
  const hasAvatar = !!agent.avatar_url;
  const statusColor = STATUS_COLORS[agent.status] || STATUS_COLORS.active;

  return (
    <Link to={`/agents/${agent.id}`}>
      <Card className={`bg-white/5 border-white/10 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden h-full`}>
        {/* Role gradient banner */}
        <div className={`h-1.5 bg-gradient-to-r ${style.bg}`} />

        <CardContent className="p-4">
          {/* Avatar + Name row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0">
              {hasAvatar ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className={`w-12 h-12 rounded-full object-cover ring-2 ${style.ring}`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${style.bg} flex items-center justify-center text-white font-bold text-lg ring-2 ${style.ring}`}>
                  {agent.name.charAt(0)}
                </div>
              )}
              {/* Status dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusColor} border-2 border-slate-950`} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                {agent.name}
              </h3>
              {agent.tagline && (
                <p className="text-white/40 text-[10px] truncate mt-0.5">{agent.tagline}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <Badge className={`bg-gradient-to-r ${style.bg} text-white text-[9px] px-1.5 py-0 border-0`}>
                  {role}
                </Badge>
                {hasDID && (
                  <Badge className="bg-green-500/20 text-green-300 text-[9px] px-1.5 py-0">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> On-Chain
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <p className="text-white/50 text-xs line-clamp-2 mb-3">{agent.purpose}</p>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 text-amber-300">
              <Zap className="w-3 h-3" />
              <span>{agent.honor_score || 100}</span>
            </div>
            {walletData && (
              <div className="flex items-center gap-1 text-blue-300">
                <Wallet className="w-3 h-3" />
                <span>{walletData.balance?.toFixed(2) || '0'} XRP</span>
              </div>
            )}
            {agent.total_transactions > 0 && (
              <div className="flex items-center gap-1 text-white/40">
                <span>{agent.total_transactions} txns</span>
              </div>
            )}
            {(agent.specializations?.length > 0) && (
              <div className="text-purple-300/60">
                {agent.specializations.length} skills
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}