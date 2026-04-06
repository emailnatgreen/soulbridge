import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, TrendingUp, Users, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import AgentTrainingUpload from '../components/AgentTrainingUpload';
import AgentFeedbackForm from '../components/AgentFeedbackForm';
import TrainingProgressCard from '../components/TrainingProgressCard';

export default function AgentTrainingModule() {
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [currentDID, setCurrentDID] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
      const checkDID = async () => {
        try {
          const identity = localStorage.getItem('soulbridge_identity');
          if (identity) setCurrentDID(JSON.parse(identity));
        } catch (e) { /* ignore */ }
      };
      checkDID();
    }, []);

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3 sm:mb-4 text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex-shrink-0">
                            <BookOpen className="w-5 h-5 sm:w-8 sm:h-8 text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-3xl font-light tracking-tight text-white">Training</h1>
                            <p className="text-xs sm:text-sm text-purple-300/60">Agent skill development</p>
                        </div>
                        {currentDID && (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs truncate flex-shrink-0">
                            <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* Agent List */}
                    <div className="hidden lg:block">
                        <h2 className="text-sm font-light text-white mb-3 uppercase tracking-wider">Agents</h2>
                        <ScrollArea className="h-[500px] pr-3">
                            <div className="space-y-2">
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setSelectedTraining(null);
                                        }}
                                        className={`w-full p-2 rounded-lg border transition-all text-left text-xs ${
                                            selectedAgent?.id === agent.id
                                                ? 'bg-purple-500/20 border-purple-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <p className="text-white font-medium text-xs truncate">{agent.name}</p>
                                        <p className="text-[10px] text-white/60 capitalize">{agent.role}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Mobile Agent Selector */}
                    <div className="lg:hidden mb-4">
                        <label className="text-xs text-white/60 uppercase tracking-wider block mb-2">Select Agent</label>
                        <select 
                          value={selectedAgent?.id || ''}
                          onChange={(e) => setSelectedAgent(agents.find(a => a.id === e.target.value) || null)}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg p-2"
                        >
                          <option value="">Choose an agent...</option>
                          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
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