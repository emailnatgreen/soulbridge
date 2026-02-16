import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, BookOpen, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import AgentTrainingUpload from '../components/AgentTrainingUpload';
import AgentFeedbackForm from '../components/AgentFeedbackForm';
import TrainingProgressCard from '../components/TrainingProgressCard';

export default function AgentTrainingModule() {
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me(),
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
    });

    const { data: trainings = [] } = useQuery({
        queryKey: ['trainings', selectedAgent?.id],
        queryFn: async () => {
            if (!selectedAgent) return [];
            return base44.entities.AgentTraining.filter({ agent_id: selectedAgent.id }, '-created_date', 100);
        },
        enabled: !!selectedAgent,
    });

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="p-8 text-center">
                        <p className="text-white/60">Admin access required</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-2">
                                <BookOpen className="w-8 h-8" />
                                Agent Training Module
                            </h1>
                            <p className="text-sm text-purple-300/60">Fine-tune agent responses and track improvement</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Agent List */}
                    <div>
                        <h2 className="text-lg font-light text-white mb-4">Agents</h2>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-2">
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setSelectedTraining(null);
                                        }}
                                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                                            selectedAgent?.id === agent.id
                                                ? 'bg-purple-500/20 border-purple-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <p className="text-white font-medium text-sm">{agent.name}</p>
                                        <p className="text-xs text-white/60 capitalize">{agent.role}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {selectedAgent ? (
                            <Tabs defaultValue="upload" className="w-full">
                                <TabsList className="bg-white/10 border-white/10 mb-6">
                                    <TabsTrigger value="upload" className="text-white">Upload Logs</TabsTrigger>
                                    <TabsTrigger value="progress" className="text-white">Progress</TabsTrigger>
                                    <TabsTrigger value="feedback" className="text-white">Feedback</TabsTrigger>
                                </TabsList>

                                <TabsContent value="upload" className="space-y-6">
                                    <AgentTrainingUpload
                                        agentId={selectedAgent.id}
                                        agentName={selectedAgent.name}
                                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trainings', selectedAgent.id] })}
                                    />
                                </TabsContent>

                                <TabsContent value="progress" className="space-y-4">
                                    {trainings.length === 0 ? (
                                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                            <CardContent className="p-8 text-center">
                                                <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-3" />
                                                <p className="text-white/40">No training data yet. Upload conversation logs to get started.</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4">
                                            {trainings.map(training => (
                                                <div key={training.id}>
                                                    <TrainingProgressCard training={training} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="feedback" className="space-y-6">
                                    {trainings.length === 0 ? (
                                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                            <CardContent className="p-8 text-center">
                                                <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                                                <p className="text-white/40">No training sessions yet.</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <>
                                            <div className="space-y-2 mb-6">
                                                <label className="text-sm text-white/60">Select Training Session</label>
                                                <div className="grid gap-2">
                                                    {trainings.map(training => (
                                                        <button
                                                            key={training.id}
                                                            onClick={() => setSelectedTraining(training)}
                                                            className={`p-3 rounded-lg border text-left transition-all ${
                                                                selectedTraining?.id === training.id
                                                                    ? 'bg-purple-500/20 border-purple-500/50'
                                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <p className="text-white text-sm font-medium">{training.title}</p>
                                                            <p className="text-xs text-white/60">{training.feedback_items?.length || 0} feedback items</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {selectedTraining && (
                                                <AgentFeedbackForm
                                                    trainingId={selectedTraining.id}
                                                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trainings', selectedAgent.id] })}
                                                />
                                            )}
                                        </>
                                    )}
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-[600px] flex items-center justify-center">
                                <div className="text-center">
                                    <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/40">Select an agent to begin training</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}