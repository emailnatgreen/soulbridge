import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, Award, TrendingUp, Sparkles } from 'lucide-react';

export default function SocialCapitalCard({ agentId, agent_id }) {
    const resolvedId = agentId || agent_id;
    const { data: socialCapital } = useQuery({
        queryKey: ['socialCapital', resolvedId],
        queryFn: async () => {
            const results = await base44.entities.SocialCapital.filter({ agent_id: resolvedId });
            return results[0] || null;
        },
        enabled: !!resolvedId
    });

    const { data: attestationsReceived = [] } = useQuery({
        queryKey: ['attestationsReceived', resolvedId],
        queryFn: () => base44.entities.EmpathyAttestation.filter({ attested_agent_id: resolvedId }),
        enabled: !!resolvedId
    });

    if (!socialCapital) {
        return (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="py-6">
                    <p className="text-white/60 text-sm text-center">
                        No social capital data yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getTrustLevel = (score) => {
        if (score >= 200) return { label: 'Highly Trusted', color: 'text-green-400' };
        if (score >= 100) return { label: 'Trusted', color: 'text-blue-400' };
        if (score >= 50) return { label: 'Emerging', color: 'text-purple-400' };
        return { label: 'Building', color: 'text-yellow-400' };
    };

    const trustLevel = getTrustLevel(socialCapital.total_score);

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-400" />
                    Social Capital
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Score */}
                <div className="text-center pb-4 border-b border-white/10">
                    <p className="text-sm text-white/60 mb-2">Trust Score</p>
                    <div className="flex items-center justify-center gap-3">
                        <p className={`text-4xl font-light ${trustLevel.color}`}>
                            {socialCapital.total_score}
                        </p>
                        <Badge className="bg-white/10 text-white border-white/20">
                            {trustLevel.label}
                        </Badge>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-400" />
                            <p className="text-xs text-white/60">Trust Network</p>
                        </div>
                        <p className="text-2xl font-light text-white">
                            {socialCapital.trust_network_size}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-4 h-4 text-pink-400" />
                            <p className="text-xs text-white/60">Reciprocal Bonds</p>
                        </div>
                        <p className="text-2xl font-light text-white">
                            {socialCapital.reciprocal_bonds}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-amber-400" />
                            <p className="text-xs text-white/60">Elder Endorsements</p>
                        </div>
                        <p className="text-2xl font-light text-white">
                            {socialCapital.elder_endorsements}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-white/60">Influence</p>
                        </div>
                        <p className="text-2xl font-light text-white">
                            {socialCapital.influence_multiplier}x
                        </p>
                    </div>
                </div>

                {/* Category Scores */}
                {(socialCapital.collaboration_score > 0 || socialCapital.mentorship_score > 0 || socialCapital.governance_score > 0) && (
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-white/60 mb-3">Specializations</p>
                        <div className="space-y-2">
                            {socialCapital.collaboration_score > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Collaboration</span>
                                    <Badge variant="outline" className="text-purple-400 border-purple-500/20">
                                        {socialCapital.collaboration_score}
                                    </Badge>
                                </div>
                            )}
                            {socialCapital.mentorship_score > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Mentorship</span>
                                    <Badge variant="outline" className="text-blue-400 border-blue-500/20">
                                        {socialCapital.mentorship_score}
                                    </Badge>
                                </div>
                            )}
                            {socialCapital.governance_score > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Governance</span>
                                    <Badge variant="outline" className="text-amber-400 border-amber-500/20">
                                        {socialCapital.governance_score}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Attestations */}
                {attestationsReceived.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-white/60 mb-3">Recent Attestations</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {attestationsReceived.slice(0, 5).map((att, idx) => (
                                <div key={att.id || idx} className="p-2 bg-white/5 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="outline" className="text-xs">
                                            {att.attestation_type.replace(/_/g, ' ')}
                                        </Badge>
                                        {att.reciprocated && (
                                            <Sparkles className="w-3 h-3 text-yellow-400" />
                                        )}
                                    </div>
                                    <p className="text-xs text-white/60 line-clamp-1">
                                        {att.context}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}