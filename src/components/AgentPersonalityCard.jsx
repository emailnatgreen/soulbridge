import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Heart, Zap, Target, AlertTriangle, MessageCircle, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function AgentPersonalityCard({ agent }) {
    const queryClient = useQueryClient();
    const personality = agent.metadata?.personality_profile;

    const generatePersonalityMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('generateAgentPersonality', {
                agent_id: agent.id
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['agent', agent.id]);
        }
    });

    if (!personality) {
        return (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="py-8 text-center">
                    <Brain className="w-12 h-12 text-purple-400/40 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Personality not yet defined</p>
                    <Button
                        onClick={() => generatePersonalityMutation.mutate()}
                        disabled={generatePersonalityMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                        {generatePersonalityMutation.isPending ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Generating Soul...
                            </>
                        ) : (
                            <>
                                <Brain className="w-4 h-4 mr-2" />
                                Generate Personality
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const traits = personality.core_traits || {};
    const traitColors = {
        openness: 'from-purple-500 to-pink-500',
        conscientiousness: 'from-blue-500 to-cyan-500',
        extraversion: 'from-orange-500 to-yellow-500',
        agreeableness: 'from-green-500 to-emerald-500',
        emotional_stability: 'from-indigo-500 to-purple-500'
    };

    return (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border-purple-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Personality Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Narrative Voice */}
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300/80 italic">
                        "{personality.narrative_voice}"
                    </p>
                </div>

                {/* Core Traits */}
                <div>
                    <p className="text-xs text-white/60 mb-3 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Core Traits
                    </p>
                    <div className="space-y-2">
                        {Object.entries(traits).map(([trait, value]) => (
                            <div key={trait}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-white/80 capitalize">{trait.replace(/_/g, ' ')}</span>
                                    <span className="text-xs text-white font-medium">{value}/10</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                        className={`bg-gradient-to-r ${traitColors[trait]} h-2 rounded-full transition-all`}
                                        style={{ width: `${(value / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values & Motivations */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-white/60 mb-2 flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Values
                        </p>
                        <div className="space-y-1">
                            {personality.values?.map((value, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {value}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-white/60 mb-2 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Motivations
                        </p>
                        <div className="space-y-1">
                            {personality.motivations?.map((motivation, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-green-400">
                                    {motivation}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Communication Style */}
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-blue-300/60 mb-1 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Communication Style
                    </p>
                    <p className="text-xs text-blue-300/90">{personality.communication_style}</p>
                </div>

                {/* Inner Conflict */}
                {personality.inner_conflict && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-xs text-red-300/60 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Inner Conflict
                        </p>
                        <p className="text-xs text-red-300/90">{personality.inner_conflict}</p>
                    </div>
                )}

                {/* Signature Phrases */}
                {personality.signature_phrases?.length > 0 && (
                    <div>
                        <p className="text-xs text-white/60 mb-2">Signature Phrases</p>
                        <div className="space-y-1">
                            {personality.signature_phrases.map((phrase, idx) => (
                                <p key={idx} className="text-xs text-purple-300/80 italic">
                                    "...{phrase}..."
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}