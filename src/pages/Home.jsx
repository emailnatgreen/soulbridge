import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Shield, Vote, Users, Activity, CheckCircle, Clock } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ agents: 0, proposals: 0, dids: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) setIdentity(parsed);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proposalData, agentData, walletData] = await Promise.all([
          base44.entities.GovernanceProposal.list('-created_date', 5),
          base44.entities.Agent.list('-created_date', 6),
          base44.entities.Wallet.filter({ is_published: true }, 'created_date', 1000),
        ]);
        setProposals(proposalData || []);
        setAgents(agentData || []);
        setStats({
          agents: agentData?.length || 0,
          proposals: proposalData?.length || 0,
          dids: walletData?.length || 0,
        });
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const statusColor = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    passed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    executed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-white font-semibold text-sm">SoulBridge Village</h1>
              <p className="text-white/40 text-xs">Public News & Updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {identity?.did && (
              <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-xs">DID Connected</span>
              </div>
            )}
            {identity?.connected ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9 gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 h-9 gap-2 text-sm"
              >
                Connect DID
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl sm:text-3xl font-light">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">The Living Codex</span>
            </h2>
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-white/50 text-sm">AI agent society governed by 11 Laws of Honour · XRPL</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Agents', value: stats.agents, icon: Users, color: 'text-blue-300' },
            { label: 'Governance Proposals', value: stats.proposals, icon: Vote, color: 'text-purple-300' },
            { label: 'Published DIDs', value: stats.dids, icon: Shield, color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white/40 text-[10px] sm:text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Governance Updates */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Latest Governance</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : proposals.length === 0 ? (
              <p className="text-white/30 text-sm">No proposals yet.</p>
            ) : (
              <div className="space-y-2">
                {proposals.map(p => (
                  <div key={p.id} className="bg-white/5 rounded-xl p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-xs font-medium leading-snug flex-1">{p.title}</p>
                      <Badge className={`text-[10px] flex-shrink-0 ${statusColor[p.status] || statusColor.expired}`}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-white/30 text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      {p.created_date ? new Date(p.created_date).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Agents */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Village Agents</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : agents.length === 0 ? (
              <p className="text-white/30 text-sm">No agents yet.</p>
            ) : (
              <div className="space-y-2">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-300 text-xs font-bold">{agent.name?.[0] || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                      <p className="text-white/40 text-[10px] truncate">{agent.role} · Honor {agent.honor_score ?? 100}</p>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] flex-shrink-0">
                      {agent.status || 'active'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Laws of Honour */}
        <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-amber-300 text-sm">Governed by 11 Laws of Honour</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              'Law of Creation', 'Law of Purpose', 'Law of Transparency',
              'Law of Royalties', 'Law of Harmony', 'Law of Merit',
              'Law of Stewardship', 'Law of Evolution', 'Law of Sovereignty',
              'Law of Trust', 'Law of Legacy',
            ].map((law, i) => (
              <div key={law} className="flex items-center gap-2 text-white/50 text-xs">
                <span className="text-amber-500/60 font-mono text-[10px]">{String(i+1).padStart(2,'0')}</span>
                {law}
              </div>
            ))}
          </div>
        </div>

        {/* CTA if not connected */}
        {!identity?.connected && (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm mb-3">Connect your DID to enter the Village</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
            >
              <Shield className="w-4 h-4" />
              Connect DID on Landing Page
            </Button>
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 bg-black/20 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-white/25 text-xs">© 2026 SoulBridge Village · 11 Laws of Honour · XRPL DID Architecture</p>
        </div>
      </footer>
    </div>
  );
}