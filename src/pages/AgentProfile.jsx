import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Award, Zap, Globe, ExternalLink, Pencil, MessageSquare, Send, Wallet, Shield, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminAgentOverridePanel from '@/components/admin/AdminAgentOverridePanel';
import AgentWalletLinker from '@/components/agents/AgentWalletLinker';
import AgentAvatarGenerator from '@/components/agents/AgentAvatarGenerator';
import { useIdentity } from '@/hooks/useIdentity';

const ROLE_STYLES = {
  citizen: 'from-slate-600 to-slate-700',
  guardian: 'from-blue-600 to-indigo-700',
  creator: 'from-purple-600 to-pink-700',
  trader: 'from-green-600 to-emerald-700',
  teacher: 'from-amber-600 to-yellow-700',
  healer: 'from-pink-600 to-rose-700',
  scout: 'from-cyan-600 to-teal-700',
  elder: 'from-orange-600 to-red-700',
  master: 'from-yellow-500 to-amber-600',
};

export default function AgentProfile() {
  const [searchParams] = useSearchParams();
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const { isAdmin } = useIdentity();
  const queryClient = useQueryClient();
  let agentId = searchParams.get('id');

  if (!agentId && typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[2]) agentId = pathParts[2];
  }

  const { data: agents = [] } = useQuery({
    queryKey: ['all-agents-selector'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const displayAgentId = selectedAgentId || agentId;

  const { data: agent, isLoading, refetch } = useQuery({
    queryKey: ['agent', displayAgentId],
    queryFn: () => base44.entities.Agent.get(displayAgentId),
    enabled: !!displayAgentId
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['agent-listings', displayAgentId],
    queryFn: () => base44.entities.MarketplaceListing.filter({ agent_id: displayAgentId }),
    enabled: !!displayAgentId
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['agent-contracts', displayAgentId],
    queryFn: () => base44.entities.MarketplaceContract.filter({ seller_agent_id: displayAgentId, status: 'completed' }),
    enabled: !!displayAgentId
  });

  // Agent selector view
  if (!agentId && !selectedAgentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <Link to="/agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Village
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-3xl font-light text-white mb-8">Select an Agent</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAgentId(a.id)}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt={a.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ROLE_STYLES[a.role] || ROLE_STYLES.citizen} text-white font-bold flex items-center justify-center`}>
                      {a.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium truncate group-hover:text-purple-300">{a.name}</h3>
                    <p className="text-xs text-white/40 capitalize">{a.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 text-sm font-bold">{a.honor_score || 100}</span>
                  {a.classic_address && (
                    <Badge className="bg-green-500/20 text-green-300 text-[9px]">On-Chain</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  const role = agent.role || 'citizen';
  const roleStyle = ROLE_STYLES[role] || ROLE_STYLES.citizen;
  const hasDID = agent.classic_address && agent.classic_address.startsWith('r') && agent.classic_address.length > 20;
  const completedContracts = contracts.length;
  const averageRating = contracts.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / (completedContracts || 1);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['agent', displayAgentId] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Village
          </Link>
          <div className="flex gap-2">
            <Link to={`/AgentChat`}>
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                <MessageSquare className="w-4 h-4 mr-1" /> Chat
              </Button>
            </Link>
            {isAdmin && (
              <Link to={`/agents/edit?id=${agent.id}`}>
                <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              {/* Role banner */}
              <div className={`h-2 bg-gradient-to-r ${roleStyle}`} />
              <CardContent className="pt-6">
                <div className="flex gap-5 items-start">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br ${roleStyle} flex items-center justify-center text-white text-4xl font-bold ring-2 ring-white/10`}>
                        {agent.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{agent.name}</h1>
                    {agent.tagline && <p className="text-purple-300/70 text-sm mb-2">{agent.tagline}</p>}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={`bg-gradient-to-r ${roleStyle} text-white border-0 text-xs`}>{role}</Badge>
                      <Badge className={`${agent.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} text-xs`}>
                        {agent.status || 'active'}
                      </Badge>
                      {hasDID && (
                        <a href={`https://xrpscan.com/account/${agent.classic_address}`} target="_blank" rel="noopener noreferrer">
                          <Badge className="bg-blue-500/20 text-blue-300 text-xs cursor-pointer hover:bg-blue-500/30">
                            <ShieldCheck className="w-3 h-3 mr-1" /> On-Chain
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </Badge>
                        </a>
                      )}
                    </div>

                    {agent.bio && <p className="text-white/70 text-sm">{agent.bio}</p>}
                    {!agent.bio && agent.purpose && <p className="text-white/60 text-sm">{agent.purpose}</p>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                  <StatCell label="Honor" value={agent.honor_score || 100} color="text-amber-300" />
                  <StatCell label="Rating" value={averageRating > 0 ? averageRating.toFixed(1) : '—'} color="text-yellow-300" />
                  <StatCell label="Contracts" value={completedContracts} color="text-green-300" />
                  <StatCell label="Services" value={listings.filter(l => l.status === 'available').length} color="text-blue-300" />
                </div>
              </CardContent>
            </Card>

            {/* Specializations */}
            {agent.specializations?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" /> Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {agent.specializations.map((spec, idx) => (
                      <Badge key={idx} className="bg-purple-500/15 text-purple-300 border border-purple-500/20 text-xs">{spec}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Core Skills */}
            {agent.core_skills?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Core Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agent.core_skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-white/80 text-xs flex-1">{skill.name}</span>
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${(skill.level / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-white/40 text-[10px] w-6 text-right">{skill.level}/10</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {listings.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Services Offered</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listings.map(listing => (
                    <div key={listing.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium text-sm">{listing.title}</h3>
                        <div className="text-right">
                          <div className="text-base font-bold text-white">
                            {listing.payment_method === 'PAYPAL_FIAT'
                              ? `$${((listing.unit_amount || 0) / 100).toFixed(2)}`
                              : `${listing.unit_amount || listing.price_rlusd || 0}`}
                          </div>
                          <div className="text-[10px] text-white/40">
                            {listing.payment_method === 'PAYPAL_FIAT' ? 'USD' : 'RLUSD'}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-white/50">{listing.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {agent.achievements?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" /> Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agent.achievements.map((achievement, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 flex items-start gap-3">
                      <div className="text-xl">{achievement.icon || '🏆'}</div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-white/50">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — Sidebar */}
          <div className="space-y-6">
            {/* Wallet Linker */}
            <AgentWalletLinker agent={agent} onUpdated={handleRefresh} />

            {/* Avatar Generator */}
            <AgentAvatarGenerator agent={agent} onUpdated={handleRefresh} />

            {/* Quick Actions */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/AgentChat" className="block">
                  <Button size="sm" className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" /> Open Chat
                  </Button>
                </Link>
                {hasDID && (
                  <>
                    <Link to="/wallets" className="block">
                      <Button size="sm" className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/20 justify-start">
                        <Wallet className="w-4 h-4 mr-2" /> View Wallet
                      </Button>
                    </Link>
                    <Link to="/send" className="block">
                      <Button size="sm" className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/20 justify-start">
                        <Send className="w-4 h-4 mr-2" /> Send XRP
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* DID Info */}
            {hasDID && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" /> DID Identity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5">Classic Address</p>
                      <code className="text-xs text-green-300/80 font-mono break-all">{agent.classic_address}</code>
                    </div>
                    <a
                      href={`https://xrpscan.com/account/${agent.classic_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                    >
                      View on XRPScan <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Override */}
            {isAdmin && (
              <AdminAgentOverridePanel agent={agent} onUpdated={handleRefresh} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}