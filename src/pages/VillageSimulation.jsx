import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Zap, Sun, Moon, Sparkles, Activity, Users, Clock, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function VillageSimulationPage() {

    // Fetch simulation state from backend
    const { data: simState } = useQuery({
        queryKey: ['simulationState'],
        queryFn: async () => {
            const states = await base44.entities.SimulationState.list();
            return states[0] || null;
        },
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: agentStates = [] } = useQuery({
        queryKey: ['agentStates'],
        queryFn: () => base44.entities.AgentState.list(),
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const { data: events = [] } = useQuery({
        queryKey: ['simulationEvents'],
        queryFn: () => base44.entities.SimulationEvent.list('-tick', 50),
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    // Create a map of agent states for quick lookup
    const agentStateMap = new Map(agentStates.map(s => [s.agent_id, s]));

    const toggleSimulation = async () => {
        if (simState) {
            await base44.entities.SimulationState.update(simState.id, {
                is_running: !simState.is_running
            });
        }
    };

    const getMoodEmoji = (mood) => {
        const moods = {
            troubled: '😟',
            calm: '😌',
            peaceful: '😊',
            joyful: '😄',
            festive: '🎉'
        };
        return moods[mood] || '😊';
    };

    const getActivityIcon = (activity) => {
        const icons = {
            working: '⚡',
            resting: '💤',
            learning: '📚',
            creating: '🎨',
            trading: '💰',
            exploring: '🗺️',
            idle: '✨'
        };
        return icons[activity] || '✨';
    };

    if (!simState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="text-white">Loading simulation...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Link to={createPageUrl('Home')}>
                                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                </Link>
                                <Button 
                                    onClick={() => generateWorldEventMutation.mutate()}
                                    disabled={generateWorldEventMutation.isPending}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                                    size="sm"
                                >
                                    {generateWorldEventMutation.isPending ? (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-4 h-4 mr-2" />
                                            Generate World Event
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-white">Village Simulation</h1>
                                <p className="text-sm text-purple-300/60">Living world where agents grow and flourish</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={simState.is_running ? "default" : "secondary"} className="text-sm px-3 py-1">
                                {simState.is_running ? '🟢 Running' : '⏸️ Paused'}
                            </Badge>
                            <span className="text-sm text-white/60">
                                Auto-updates every 5 minutes
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Village Status */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80 flex items-center gap-2">
                                {simState.is_night ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white capitalize">{simState.phase}</p>
                            <p className="text-sm text-white/60">Hour {simState.hour}, Day {simState.day}</p>
                            <p className="text-sm text-purple-300/60 capitalize">{simState.season}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-amber-300/80 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Village Energy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{simState.energy}%</p>
                            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                                <div 
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${simState.energy}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-pink-300/80 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Village Mood
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white flex items-center gap-2 capitalize">
                                {getMoodEmoji(simState.overall_mood)}
                                {simState.overall_mood}
                            </p>
                            <p className="text-xs text-white/60 mt-1">{simState.mood_suggestion}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-emerald-300/80 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Population
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{agents.length}</p>
                            <p className="text-sm text-white/60">Active Agents</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Tick
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{simState.tick}</p>
                            <p className="text-xs text-white/60">
                                {new Date(simState.last_tick_timestamp).toLocaleTimeString()}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Agents */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Active Agents
                        </CardTitle>
                        <p className="text-sm text-white/60">Real-time status of all village inhabitants</p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {agents.map(agent => {
                                const state = agentStateMap.get(agent.id);
                                if (!state) return null;
                                
                                return (
                                    <div key={agent.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-white font-medium">{agent.name}</p>
                                                <p className="text-xs text-white/60 capitalize">{agent.role}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs capitalize">
                                                {getActivityIcon(state.current_activity)} {state.current_activity}
                                            </Badge>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-white/70">Energy</span>
                                                <span className="text-white font-medium">{state.energy}%</span>
                                            </div>
                                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                                <div 
                                                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${state.energy}%` }}
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-white/70">Mood</span>
                                                <span className="text-white font-medium capitalize">
                                                    {getMoodEmoji(state.mood)} {state.mood}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                                <div>
                                                    <p className="text-xs text-white/60">Wisdom</p>
                                                    <p className="text-sm text-purple-300 font-medium">{Math.floor(state.wisdom)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white/60">Experience</p>
                                                    <p className="text-sm text-blue-300 font-medium">{state.experience}</p>
                                                </div>
                                            </div>
                                            
                                            {state.relationships && Object.keys(state.relationships).length > 0 && (
                                                <div className="pt-2">
                                                    <p className="text-xs text-white/60">
                                                        💫 {Object.keys(state.relationships).length} relationships
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Events */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Recent Events
                        </CardTitle>
                        <p className="text-sm text-white/60">Live stream of village activities and changes</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {events.length === 0 ? (
                                <p className="text-white/60 text-sm text-center py-8">
                                    Waiting for simulation events...
                                </p>
                            ) : (
                                events.map((event, idx) => (
                                    <div key={event.id || idx} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="text-white/90 text-sm">{event.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        Tick {event.tick}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs capitalize">
                                                        {event.event_type.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {event.event_type === 'interaction' && (
                                                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                            )}
                                            {event.event_type === 'axi_action' && (
                                                <TrendingUp className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                            )}
                                            {event.event_type === 'mood_change' && (
                                                <Activity className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}