import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, TrendingUp, Users, Award, Target, RefreshCw, Crown, Shield } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function SocialCapitalDashboard() {
    const queryClient = useQueryClient();

    const { data: socialCapital = [] } = useQuery({
        queryKey: ['socialCapital'],
        queryFn: () => base44.entities.SocialCapital.list(),
        refetchInterval: 30000
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('recalculateSocialCapital', {});
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['socialCapital']);
        }
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    // Merge social capital with agent data
    const rankedAgents = socialCapital
        .map(sc => ({
            ...sc,
            agent: agentMap.get(sc.agent_id)
        }))
        .sort((a, b) => b.total_score - a.total_score);

    const topInfluencers = rankedAgents.slice(0, 5);
    const avgSocialCapital = rankedAgents.length > 0
        ? rankedAgents.reduce((sum, a) => sum + a.total_score, 0) / rankedAgents.length
        : 0;

    const totalAttestations = rankedAgents.reduce((sum, a) => sum + (a.attestations_received || 0), 0);
    const totalReciprocalBonds = rankedAgents.reduce((sum, a) => sum + (a.reciprocal_bonds || 0), 0);

    const getRoleIcon = (role) => {
        const icons = {
            elder: Crown,
            master: Crown,
            guardian: Shield,
            teacher: Users
        };
        return icons[role] || Users;
    };

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
                                    <Award className="w-8 h-8" />
                                    Social Capital Dashboard
                                </h1>
                                <p className="text-sm text-purple-300/60">Influence, trust, and reputation tracking</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => recalculateMutation.mutate()}
                            disabled={recalculateMutation.isPending}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                            Recalculate
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Average Capital</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{Math.round(avgSocialCapital)}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80">Total Attestations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{totalAttestations}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300/80">Reciprocal Bonds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{totalReciprocalBonds}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80">Tracked Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{rankedAgents.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Influencers */}
                    <Card className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 backdrop-blur-xl border-amber-500/30">
                        <CardHeader>
                            <CardTitle className="text-amber-300 flex items-center gap-2">
                                <Crown className="w-5 h-5" />
                                Top Influencers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topInfluencers.map((sc, idx) => {
                                    const Icon = getRoleIcon(sc.agent?.role);
                                    return (
                                        <div key={sc.id} className="p-3 bg-white/10 rounded-lg border border-amber-500/20">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-bold text-amber-300">#{idx + 1}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="w-4 h-4 text-amber-400" />
                                                            <span className="text-white font-medium">{sc.agent?.name}</span>
                                                        </div>
                                                        <Badge className="mt-1 bg-amber-500/30 text-amber-300 text-xs capitalize">
                                                            {sc.agent?.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-amber-300">{sc.total_score}</div>
                                                    <div className="text-xs text-amber-300/60">influence</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                                                <div className="text-white/60">
                                                    Network: <span className="text-white">{sc.trust_network_size}</span>
                                                </div>
                                                <div className="text-white/60">
                                                    Multiplier: <span className="text-green-300">{sc.influence_multiplier?.toFixed(2)}x</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Agents Ranking */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Complete Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {rankedAgents.map((sc, idx) => {
                                        const maxScore = rankedAgents[0]?.total_score || 100;
                                        const percentage = (sc.total_score / maxScore) * 100;
                                        
                                        return (
                                            <div key={sc.id} className="p-3 bg-white/5 rounded border border-white/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-white/60 font-medium w-8">#{idx + 1}</span>
                                                        <div>
                                                            <span className="text-white">{sc.agent?.name}</span>
                                                            <span className="text-white/40 text-sm ml-2">({sc.agent?.role})</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-medium text-white">{sc.total_score}</div>
                                                        <div className="text-xs text-green-300">{sc.influence_multiplier?.toFixed(2)}x</div>
                                                    </div>
                                                </div>
                                                <Progress value={percentage} className="h-2 mb-2" />
                                                <div className="grid grid-cols-4 gap-2 text-xs text-white/60">
                                                    <div>
                                                        <Target className="w-3 h-3 inline mr-1" />
                                                        {sc.attestations_received} received
                                                    </div>
                                                    <div>
                                                        <Users className="w-3 h-3 inline mr-1" />
                                                        {sc.trust_network_size} network
                                                    </div>
                                                    <div>
                                                        <Award className="w-3 h-3 inline mr-1" />
                                                        {sc.reciprocal_bonds} bonds
                                                    </div>
                                                    <div>
                                                        <Crown className="w-3 h-3 inline mr-1" />
                                                        {sc.elder_endorsements} elder
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

                {/* Detailed Breakdown */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-6">
                    <CardHeader>
                        <CardTitle className="text-white">Social Capital Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {rankedAgents.slice(0, 9).map(sc => (
                                <div key={sc.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                                    <h3 className="text-white font-medium mb-3">{sc.agent?.name}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Collaboration:</span>
                                            <span className="text-blue-300">{sc.collaboration_score}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Mentorship:</span>
                                            <span className="text-purple-300">{sc.mentorship_score}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Governance:</span>
                                            <span className="text-green-300">{sc.governance_score}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Attestations:</span>
                                            <span className="text-white">{sc.attestations_given} given</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}