import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, GraduationCap, Play, Target, Sparkles, TrendingUp, Award, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import EventNarrativeCard from '../components/EventNarrativeCard';

export default function TrainingSimulation() {
    const [selectedAgent, setSelectedAgent] = useState('');
    const [focusSkill, setFocusSkill] = useState('');
    const queryClient = useQueryClient();

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: trainings = [] } = useQuery({
        queryKey: ['agentTrainings'],
        queryFn: () => base44.entities.AgentTraining.list('-created_date', 50)
    });

    const { data: skills = [] } = useQuery({
        queryKey: ['agentSkills', selectedAgent],
        queryFn: () => selectedAgent ? base44.entities.AgentSkill.filter({ agent_id: selectedAgent }) : [],
        enabled: !!selectedAgent
    });

    const generateScenarioMutation = useMutation({
        mutationFn: async (params) => {
            const response = await base44.functions.invoke('generateTrainingScenario', params);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['agentTrainings']);
        }
    });

    const runSimulationMutation = useMutation({
        mutationFn: async (trainingId) => {
            const response = await base44.functions.invoke('runTrainingSimulation', { training_id: trainingId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['agentTrainings']);
        }
    });

    const agentsWithPersonality = agents.filter(a => a.metadata?.personality_profile);
    const selectedAgentData = agents.find(a => a.id === selectedAgent);

    const skillCategories = ['governance', 'resource_management', 'diplomacy', 'technical', 'wisdom', 'combat'];
    const agentSkills = skillCategories.map(cat => {
        const skill = skills.find(s => s.skill_category === cat);
        return {
            category: cat,
            level: skill?.level || 0,
            gap: 5 - (skill?.level || 0)
        };
    });

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
                                    <GraduationCap className="w-8 h-8" />
                                    Training Simulation
                                </h1>
                                <p className="text-sm text-purple-300/60">Personalized skill development through immersive scenarios</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Total Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{trainings.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300/80">Completed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {trainings.filter(t => t.status === 'completed').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80">In Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {trainings.filter(t => t.status === 'in_progress').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80">Avg. Success</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {trainings.filter(t => t.status === 'completed').length > 0 
                                    ? ((trainings.filter(t => t.assessment?.passed).length / trainings.filter(t => t.status === 'completed').length) * 100).toFixed(0)
                                    : 0}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Training Setup */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                Generate Training Scenario
                            </CardTitle>
                            <CardDescription className="text-white/60">
                                AI creates personalized training based on personality & skill gaps
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm text-white/60 mb-2 block">Select Agent</label>
                                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
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
                            </div>

                            {selectedAgent && agentSkills.length > 0 && (
                                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <p className="text-sm text-blue-300 mb-3">Skill Assessment</p>
                                    <div className="space-y-2">
                                        {agentSkills.map(skill => (
                                            <div key={skill.category}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-white/80 capitalize">{skill.category.replace(/_/g, ' ')}</span>
                                                    <span className="text-white/60">{skill.level}/5</span>
                                                </div>
                                                <Progress value={skill.level * 20} className="h-1" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-white/60 mb-2 block">Focus Skill (Optional)</label>
                                <Select value={focusSkill} onValueChange={setFocusSkill}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue placeholder="Auto-select based on gaps..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {skillCategories.map(cat => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat.replace(/_/g, ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={() => generateScenarioMutation.mutate({
                                    agent_id: selectedAgent,
                                    focus_skill: focusSkill || undefined
                                })}
                                disabled={!selectedAgent || generateScenarioMutation.isPending}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                                {generateScenarioMutation.isPending ? (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                        Generating Scenario...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Training
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Trainings */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Recent Training Sessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {trainings.slice(0, 5).map(training => {
                                    const agent = agents.find(a => a.id === training.agent_id);
                                    return (
                                        <div key={training.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="text-white text-sm font-medium mb-1">{training.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {agent?.name}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs capitalize">
                                                            {training.skill_focus?.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {training.status === 'not_started' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => runSimulationMutation.mutate(training.id)}
                                                        disabled={runSimulationMutation.isPending}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Play className="w-3 h-3 mr-1" />
                                                        Run
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-white/60">Progress</span>
                                                    <span className="text-white/80">
                                                        {training.progress?.completion_percentage || 0}%
                                                    </span>
                                                </div>
                                                <Progress value={training.progress?.completion_percentage || 0} className="h-1" />
                                            </div>
                                            {training.assessment && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    {training.assessment.passed ? (
                                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                                            <Award className="w-3 h-3 mr-1" />
                                                            Passed: {training.assessment.score.toFixed(1)}/10
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                                            Score: {training.assessment.score.toFixed(1)}/10
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {trainings.length === 0 && (
                                    <div className="text-center py-8">
                                        <GraduationCap className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
                                        <p className="text-white/40 text-sm">No training sessions yet</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Completed Training Details */}
                {trainings.filter(t => t.status === 'completed' && t.training_content?.simulated_event_id).length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Training Chronicles
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {trainings
                                .filter(t => t.status === 'completed' && t.training_content?.simulated_event_id)
                                .slice(0, 4)
                                .map(training => (
                                    <TrainingNarrativeCard key={training.id} training={training} />
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TrainingNarrativeCard({ training }) {
    const { data: event } = useQuery({
        queryKey: ['trainingEvent', training.training_content?.simulated_event_id],
        queryFn: async () => {
            const events = await base44.entities.SimulatedEvent.filter({ 
                id: training.training_content.simulated_event_id 
            });
            return events[0];
        },
        enabled: !!training.training_content?.simulated_event_id
    });

    if (!event?.outcomes?.narrative) return null;

    return <EventNarrativeCard event={event} />;
}