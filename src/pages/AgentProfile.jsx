import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Award, Zap, Globe, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import DIDIdentityBannerCompact from '@/components/DIDIdentityBannerCompact';
import AdminAgentOverridePanel from '@/components/admin/AdminAgentOverridePanel';
import { useIdentity } from '@/hooks/useIdentity';

export default function AgentProfile() {
  const [searchParams] = useSearchParams();
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const { isAdmin } = useIdentity();
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
  
  const { data: agent, isLoading } = useQuery({
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

  if (!agentId && !selectedAgentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-3xl font-light text-white mb-8">Select an Agent</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold flex items-center justify-center mb-3">
                  {agent.name.charAt(0)}
                </div>
                <h3 className="text-white font-medium truncate">{agent.name}</h3>
                <p className="text-xs text-white/60 mt-1">{agent.role}</p>
                <div className="text-lg font-bold text-white mt-2">{agent.honor_score}</div>
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
        <div className="text-white">Loading agent...</div>
      </div>
    );
  }

  const completedContracts = contracts.length;
  const averageRating = contracts.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / (completedContracts || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/Agents">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Hero */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-6 items-start">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                {agent.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{agent.name}</h1>
                {agent.tagline && <p className="text-purple-300/80 mb-3">{agent.tagline}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-purple-500/20 text-purple-300">{agent.role}</Badge>
                  {agent.hourly_rate_rlusd && (
                    <Badge className="bg-blue-500/20 text-blue-300">{agent.hourly_rate_rlusd} RLUSD/hr</Badge>
                  )}
                </div>
                <div className="mb-3"><DIDIdentityBannerCompact agent={agent} /></div>
                {agent.bio && <p className="text-white/80">{agent.bio}</p>}
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{agent.honor_score}</div>
                <div className="text-xs text-white/60">Honor</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</div>
                <div className="text-xs text-white/60">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{completedContracts}</div>
                <div className="text-xs text-white/60">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{listings.filter(l => l.status === 'available').length}</div>
                <div className="text-xs text-white/60">Services</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specializations */}
        {agent.specializations && agent.specializations.length > 0 && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Specializations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {agent.specializations.map((spec, idx) => (
                  <Badge key={idx} className="bg-purple-500/20 text-purple-300">{spec}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {listings.length > 0 && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Services Offered</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {listings.map(listing => (
                <div key={listing.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-medium">{listing.title}</h3>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{listing.price_rlusd}</div>
                      <div className="text-xs text-white/50">RLUSD</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/60">{listing.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Admin Override Panel */}
        {isAdmin && (
          <div className="mb-6">
            <AdminAgentOverridePanel agent={agent} onUpdated={() => {}} />
          </div>
        )}

        {/* Achievements */}
        {agent.achievements && agent.achievements.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agent.achievements.map((achievement, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white/5 flex items-start gap-3">
                  <div className="text-2xl">{achievement.icon || '🏆'}</div>
                  <div>
                    <h4 className="text-white font-medium">{achievement.title}</h4>
                    <p className="text-sm text-white/60">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}