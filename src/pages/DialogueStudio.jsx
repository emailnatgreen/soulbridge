import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, MessageCircle, Users, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DialogueExchange from '../components/DialogueExchange';

export default function DialogueStudio() {
    const [agent1Id, setAgent1Id] = useState('');
    const [agent2Id, setAgent2Id] = useState('');

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    // Filter agents with personalities
    const agentsWithPersonality = agents.filter(a => a.metadata?.personality_profile);

    const selectedAgent1 = agents.find(a => a.id === agent1Id);
    const selectedAgent2 = agents.find(a => a.id === agent2Id);

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
                                    <MessageCircle className="w-8 h-8" />
                                    Dialogue Studio
                                </h1>
                                <p className="text-sm text-purple-300/60">Watch agents converse using their unique personalities</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Agent Selection */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Select Conversation Participants
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm text-white/60 mb-2 block">First Agent</label>
                                <Select value={agent1Id} onValueChange={setAgent1Id}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Choose agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agentsWithPersonality.map(agent => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name} ({agent.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedAgent1 && (
                                    <div className="mt-2 p-3 bg-purple-500/10 rounded border border-purple-500/20">
                                        <p className="text-xs text-purple-300/80 italic">
                                            "{selectedAgent1.metadata.personality_profile.narrative_voice}"
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-sm text-white/60 mb-2 block">Second Agent</label>
                                <Select value={agent2Id} onValueChange={setAgent2Id}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Choose agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agentsWithPersonality.filter(a => a.id !== agent1Id).map(agent => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name} ({agent.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedAgent2 && (
                                    <div className="mt-2 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                                        <p className="text-xs text-blue-300/80 italic">
                                            "{selectedAgent2.metadata.personality_profile.narrative_voice}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {agentsWithPersonality.length < 2 && (
                            <div className="mt-4 p-4 bg-yellow-500/10 rounded border border-yellow-500/20">
                                <p className="text-sm text-yellow-300">
                                    Need at least 2 agents with generated personalities. Generate personalities from agent detail pages.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dialogue Exchange */}
                {selectedAgent1 && selectedAgent2 && (
                    <DialogueExchange agent1={selectedAgent1} agent2={selectedAgent2} />
                )}

                {!selectedAgent1 || !selectedAgent2 ? (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardContent className="py-12 text-center">
                            <Sparkles className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
                            <p className="text-white/60 mb-2">Select two agents to begin</p>
                            <p className="text-sm text-white/40">
                                Their personalities will drive the conversation
                            </p>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}