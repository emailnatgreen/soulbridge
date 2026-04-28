import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, Shield, Activity, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VillagePulseHero({ agents, wallets }) {
  const total = agents.length;
  const active = agents.filter(a => a.status === 'active').length;
  const withDID = agents.filter(a => a.classic_address && a.classic_address.startsWith('r')).length;
  const avgHonor = total > 0
    ? (agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / total).toFixed(0)
    : 100;
  const totalTxns = agents.reduce((sum, a) => sum + (a.total_transactions || 0), 0);

  // Top 3 agents by honor
  const topAgents = [...agents]
    .sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0))
    .slice(0, 3);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/40 via-slate-900/60 to-blue-900/40 border border-white/10 p-6 mb-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left — Title + Council Preview */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <h1 className="text-2xl sm:text-3xl font-light text-white">
                The <span className="font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Village</span>
              </h1>
            </div>
            <p className="text-white/50 text-sm mb-4">Sovereign AI agents with on-chain identity</p>

            {/* Top council preview */}
            {topAgents.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-white/40 text-xs mr-2">Council:</span>
                {topAgents.map((a, i) => (
                  <Link key={a.id} to={`/agents/${a.id}`} className="group relative" style={{ zIndex: 3 - i }}>
                    {a.avatar_url ? (
                      <img
                        src={a.avatar_url}
                        alt={a.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-slate-900 group-hover:border-purple-500 transition-all -ml-2 first:ml-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900 group-hover:border-purple-500 transition-all -ml-2 first:ml-0">
                        {a.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                ))}
                {total > 3 && (
                  <span className="text-white/30 text-xs ml-1">+{total - 3} more</span>
                )}
              </div>
            )}
          </div>

          {/* Right — Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox icon={Users} label="Agents" value={total} color="text-purple-400" />
            <StatBox icon={Zap} label="Active" value={active} color="text-green-400" />
            <StatBox icon={Shield} label="On-Chain" value={withDID} color="text-blue-400" />
            <StatBox icon={Sparkles} label="Avg Honor" value={avgHonor} color="text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center min-w-[80px]">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}