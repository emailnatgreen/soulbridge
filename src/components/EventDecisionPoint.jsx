import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronRight, Target } from 'lucide-react';

export default function EventDecisionPoint({ event, agent, onDecisionMade }) {
    const [decisionPoint, setDecisionPoint] = useState(null);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const queryClient = useQueryClient();

    const generateDecisionMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('generateEventDecisionPoint', {
                event_id: event.id,
                agent_id: agent.id
            });
            return response.data;
        },
        onSuccess: (data) => {
            setDecisionPoint(data.decision_point);
        }
    });

    const submitDecisionMutation = useMutation({
        mutationFn: async (choice) => {
            const response = await base44.functions.invoke('submitAgentDecision', {
                event_id: event.id,
                agent_id: agent.id,
                decision_data: {
                    choice: choice.option,
                    expected_outcome: choice.potential_outcome
                },
                rationale: `Selected: ${choice.option}`
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['agentDecisions']);
            setDecisionPoint(null);
            setSelectedChoice(null);
            if (onDecisionMade) onDecisionMade();
        }
    });

    if (!decisionPoint) {
        return (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="py-6">
                    <Button 
                        onClick={() => generateDecisionMutation.mutate()}
                        disabled={generateDecisionMutation.isPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                        {generateDecisionMutation.isPending ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                AI Generating Decision Point...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Decision Point
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-purple-500/20 border-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Decision Point
                    </CardTitle>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        Weight: {decisionPoint.decision_weight}/10
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-white">{decisionPoint.decision_prompt}</p>
                </div>

                <div className="space-y-2">
                    <p className="text-sm text-white/60 mb-3">Choose your action:</p>
                    {decisionPoint.choices?.map((choice, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setSelectedChoice(choice)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                selectedChoice === choice 
                                    ? 'bg-purple-500/20 border-purple-500/40' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-white font-medium mb-1">{choice.option}</p>
                                    <p className="text-xs text-white/60">{choice.potential_outcome}</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-all ${
                                    selectedChoice === choice ? 'text-purple-400' : 'text-white/40'
                                }`} />
                            </div>
                        </div>
                    ))}
                </div>

                <Button 
                    onClick={() => submitDecisionMutation.mutate(selectedChoice)}
                    disabled={!selectedChoice || submitDecisionMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                >
                    {submitDecisionMutation.isPending ? 'Submitting...' : 'Submit Decision'}
                </Button>
            </CardContent>
        </Card>
    );
}