import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Network, Users, TrendingUp, AlertTriangle, Heart, Shield } from 'lucide-react';
import RelationshipNetworkGraph from '../components/RelationshipNetworkGraph';
import { Progress } from "@/components/ui/progress";

export default function RelationshipNetwork() {
    const [selectedAgent, setSelectedAgent] = useState(null);

    const { data: relationships = [] } = useQuery({
        queryKey: ['agentRelationships'],
        queryFn: () => base44.entities.AgentRelationship.list()
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: analysis } = useQuery({
        queryKey: ['relationshipAnalysis'],
        queryFn: async () => {
            const response = await base44.functions.invoke('analyzeRelationshipDynamics', {});
            return response.data;
        },
        refetchInterval: 30000
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    const selectedAgentRels = selectedAgent
        ? relationships.filter(r => r.agent_a_id === selectedAgent || r.agent_b_id === selectedAgent)
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                                    <Network className="w-8 h-8" />
                                    Relationship Network
                                </h1>
                                <p className="text-sm text-purple-300/60">The social fabric of the Village</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Network Health */}
                {analysis?.health_metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-white/60">Overall Cohesion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-light text-white">
                                    {analysis.health_metrics.overall_cohesion.toFixed(1)}
                                </p>
                                <Progress 
                                    value={(analysis.health_metrics.overall_cohesion + 10) * 5} 
                                    className="mt-2 h-1" 
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-blue-300/80">Trust Index</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-light text-white">
                                    {analysis.health_metrics.trust_index.toFixed(1)}
                                </p>
                                <Progress 
                                    value={analysis.health_metrics.trust_index * 10} 
                                    className="mt-2 h-1" 
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-green-300/80">Strong Bonds</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-light text-white">
                                    {analysis.network_analysis.strong_bonds}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-red-300/80">Active Tensions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-light text-white">
                                    {analysis.active_tensions?.length || 0}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Network Visualization */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Network className="w-5 h-5" />
                                    Social Network Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RelationshipNetworkGraph 
                                    relationships={relationships} 
                                    agents={agents} 
                                />
                            </CardContent>
                        </Card>

                        {/* Communities */}
                        {analysis?.communities && analysis.communities.length > 0 && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-6">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Friendship Circles
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {analysis.communities.map((cluster, idx) => (
                                            <div key={idx} className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-purple-500/30 text-purple-300">
                                                        {cluster.size} members
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-white/80">
                                                    {cluster.members.join(', ')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Key Influencers */}
                        {analysis?.key_influencers && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Key Influencers
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {analysis.key_influencers.map((inf, idx) => (
                                            <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                                                <p className="text-white text-sm font-medium">{inf.agent_name}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                                                    <span>{inf.connections} connections</span>
                                                    <span>•</span>
                                                    <span>Trust: {inf.average_trust.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Most Connected */}
                        {analysis?.most_connected && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white text-sm flex items-center gap-2">
                                        <Heart className="w-4 h-4" />
                                        Most Connected
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {analysis.most_connected.map((agent, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <span className="text-white/80 text-sm">{agent.agent_name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {agent.connections}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Active Tensions */}
                        {analysis?.active_tensions && analysis.active_tensions.length > 0 && (
                            <Card className="bg-red-500/10 backdrop-blur-xl border-red-500/30">
                                <CardHeader>
                                    <CardTitle className="text-red-300 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Active Tensions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {analysis.active_tensions.slice(0, 5).map((conflict, idx) => (
                                            <div key={idx} className="p-2 bg-red-500/10 rounded border border-red-500/20">
                                                <p className="text-xs text-red-200">
                                                    {conflict.agents.join(' ⚔ ')}
                                                </p>
                                                <p className="text-xs text-red-300/60 mt-1">
                                                    Strength: {conflict.strength.toFixed(1)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* All Relationships */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            All Relationships ({relationships.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {relationships.map(rel => {
                                const agentA = agentMap.get(rel.agent_a_id);
                                const agentB = agentMap.get(rel.agent_b_id);
                                return (
                                    <div key={rel.id} className="p-3 bg-white/5 rounded border border-white/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white text-sm">{agentA?.name}</span>
                                                <span className="text-white/40">↔</span>
                                                <span className="text-white text-sm">{agentB?.name}</span>
                                            </div>
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {rel.relationship_type?.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-white/60">Strength: </span>
                                                <span className={rel.relationship_strength >= 0 ? 'text-green-300' : 'text-red-300'}>
                                                    {rel.relationship_strength?.toFixed(1)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-white/60">Trust: </span>
                                                <span className="text-blue-300">{rel.trust_level?.toFixed(1)}</span>
                                            </div>
                                            <div>
                                                <span className="text-white/60">Interactions: </span>
                                                <span className="text-white/80">{rel.interaction_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}