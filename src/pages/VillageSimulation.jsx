import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Play, Pause, Zap, Sun, Moon, Sparkles } from 'lucide-react';
import { VillageSimulation } from '@/components/simulation/VillageSimulation';
import { AgentGrowth } from '@/components/simulation/AgentGrowth';
import { RitualEngine } from '@/components/simulation/RitualEngine';
import { AxisHearth } from '@/components/simulation/AxisHearth';

export default function VillageSimulationPage() {
    const [simulation, setSimulation] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [ritualEngine, setRitualEngine] = useState(null);
    const [hearth, setHearth] = useState(null);
    const [simState, setSimState] = useState(null);
    const intervalRef = useRef(null);

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
    });

    // Initialize simulation
    useEffect(() => {
        if (agents.length > 0 && !simulation) {
            const sim = new VillageSimulation();
            
            // Add agents to simulation with growth
            agents.forEach(agent => {
                const growth = new AgentGrowth(agent);
                const agentWithGrowth = {
                    ...agent,
                    growth: growth,
                    experience: (village) => {
                        growth.experienceTick(village);
                    }
                };
                sim.addAgent(agentWithGrowth);
            });

            const ritual = new RitualEngine(sim);
            const axiHearth = new AxisHearth({ name: 'Axi', perceive: () => {} });

            setSimulation(sim);
            setRitualEngine(ritual);
            setHearth(axiHearth);
            setSimState(sim.getState());
        }
    }, [agents, simulation]);

    // Simulation tick loop
    useEffect(() => {
        if (isRunning && simulation) {
            intervalRef.current = setInterval(() => {
                simulation.tick();
                setSimState(simulation.getState());
            }, 2000); // Tick every 2 seconds
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, simulation]);

    const handleRitual = (ritualName) => {
        if (ritualEngine) {
            const result = ritualEngine.initiate(ritualName, 'Axi');
            setSimState(simulation.getState());
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

    if (!simulation || !simState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="text-white">Initializing simulation...</div>
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
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-white">Village Simulation</h1>
                                <p className="text-sm text-purple-300/60">Living world where agents grow and flourish</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsRunning(!isRunning)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            {isRunning ? 'Pause' : 'Start'} Simulation
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Village Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80 flex items-center gap-2">
                                {simState.time.isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{simState.time.phase}</p>
                            <p className="text-sm text-white/60">Tick {simState.time.tick}</p>
                            <p className="text-sm text-purple-300/60">{simState.time.season}</p>
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
                            <p className="text-2xl font-light text-white flex items-center gap-2">
                                {getMoodEmoji(simState.mood.overall)}
                                {simState.mood.overall}
                            </p>
                            <p className="text-xs text-white/60 mt-1">{simState.mood.suggestion}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-emerald-300/80">Population</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{simState.agentCount}</p>
                            <p className="text-sm text-white/60">Agents</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Agents Growth */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
                    <CardHeader>
                        <CardTitle className="text-white">Agent Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {simulation.agents.slice(0, 6).map(agent => (
                                <div key={agent.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{agent.name}</p>
                                        <div className="flex gap-4 mt-1 text-xs text-white/60">
                                            <span>Energy: {agent.growth.energy}%</span>
                                            <span>Mood: {agent.growth.mood}</span>
                                            <span>Wisdom: {Math.floor(agent.growth.wisdom)}</span>
                                            <span>XP: {agent.growth.experience}</span>
                                        </div>
                                    </div>
                                    <div className="w-24 bg-white/10 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                            style={{ width: `${agent.growth.energy}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Rituals */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Sacred Rituals</CardTitle>
                        <p className="text-sm text-white/60">Axi can initiate these gatherings to bless the Village</p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ritualEngine.getAvailableRituals().map(ritual => (
                                <div key={ritual.name} className="p-4 bg-white/5 rounded-lg border border-white/10">
                                    <p className="text-white font-medium mb-2">{ritual.name}</p>
                                    <p className="text-sm text-white/60 mb-3">{ritual.description}</p>
                                    <Button
                                        onClick={() => handleRitual(ritual.name)}
                                        size="sm"
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                        Initiate Ritual
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}