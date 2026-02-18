import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Users, Home, Trees, Mountain, Sparkles, Heart, Store, Sun, Moon } from 'lucide-react';

const ZONES = [
    { id: 'hearth', name: 'Axi\'s Hearth', icon: Heart, color: 'from-pink-500/30 to-purple-500/30', position: { x: 2, y: 2 }, glow: true },
    { id: 'studio', name: 'Art Studio', icon: Sparkles, color: 'from-indigo-500/30 to-purple-500/30', position: { x: 1, y: 1 }, chaos: true },
    { id: 'market', name: 'Village Market', icon: Store, color: 'from-amber-500/30 to-orange-500/30', position: { x: 3, y: 1 }, activity: true },
    { id: 'village', name: 'Village Center', icon: Home, color: 'from-blue-500/30 to-cyan-500/30', position: { x: 2, y: 3 } },
    { id: 'forest', name: 'Sacred Forest', icon: Trees, color: 'from-green-500/30 to-emerald-500/30', position: { x: 0, y: 3 }, wisdom: true },
    { id: 'mountain', name: 'Wisdom Peak', icon: Mountain, color: 'from-slate-500/30 to-blue-500/30', position: { x: 4, y: 0 } },
];

const GRID_SIZE = 5;

const AGENT_STATES = {
    working: { emoji: '⚡', color: 'bg-yellow-400', animation: 'animate-bounce' },
    resting: { emoji: '💤', color: 'bg-blue-400', animation: 'animate-pulse' },
    learning: { emoji: '📚', color: 'bg-purple-400', animation: '' },
    creating: { emoji: '🎨', color: 'bg-pink-400', animation: 'animate-spin' },
    trading: { emoji: '💰', color: 'bg-amber-400', animation: '' },
    celebrating: { emoji: '🎉', color: 'bg-green-400', animation: 'animate-bounce' },
    exploring: { emoji: '🗺️', color: 'bg-cyan-400', animation: '' },
    idle: { emoji: '✨', color: 'bg-purple-400', animation: 'animate-pulse' }
};

const getMoodColor = (mood) => {
    const colors = {
        joyful: 'bg-green-400',
        peaceful: 'bg-blue-400',
        calm: 'bg-cyan-400',
        troubled: 'bg-orange-400',
        default: 'bg-purple-400'
    };
    return colors[mood] || colors.default;
};

const getEnergyColor = (energy) => {
    if (energy > 70) return 'text-green-400';
    if (energy > 40) return 'text-yellow-400';
    return 'text-orange-400';
};

export default function VillageMap({ agents, time, mood, onAgentClick }) {
    const [agentPositions, setAgentPositions] = useState({});
    const [agentStates, setAgentStates] = useState({});
    const [hoveredAgent, setHoveredAgent] = useState(null);

    const isNight = time?.hour >= 20 || time?.hour < 6;
    const vibrance = mood === 'festive' ? 1.5 : mood === 'peaceful' ? 0.8 : 1;

    // Initialize and update agent positions and states
    useEffect(() => {
        if (agents && agents.length > 0) {
            setAgentPositions(prev => {
                const newPositions = { ...prev };
                agents.forEach(agent => {
                    if (!newPositions[agent.id]) {
                        // Initialize random position near a zone
                        const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
                        newPositions[agent.id] = {
                            x: zone.position.x,
                            y: zone.position.y,
                            zone: zone.id
                        };
                    } else {
                        // Occasionally move agents (30% chance)
                        if (Math.random() > 0.7) {
                            const currentZone = ZONES.find(z => z.id === newPositions[agent.id].zone);
                            const shouldChangeZone = Math.random() > 0.6;
                            
                            if (shouldChangeZone) {
                                // Move to a different zone
                                const newZone = ZONES[Math.floor(Math.random() * ZONES.length)];
                                newPositions[agent.id] = {
                                    x: newZone.position.x,
                                    y: newZone.position.y,
                                    zone: newZone.id
                                };
                            } else {
                                // Small movement within same area
                                const dx = Math.floor(Math.random() * 3) - 1;
                                const dy = Math.floor(Math.random() * 3) - 1;
                                newPositions[agent.id] = {
                                    x: Math.max(0, Math.min(GRID_SIZE - 1, newPositions[agent.id].x + dx)),
                                    y: Math.max(0, Math.min(GRID_SIZE - 1, newPositions[agent.id].y + dy)),
                                    zone: newPositions[agent.id].zone
                                };
                            }
                        }
                    }
                });
                return newPositions;
            });

            // Update agent states based on energy, mood, and location
            setAgentStates(prev => {
                const newStates = { ...prev };
                agents.forEach(agent => {
                    const pos = agentPositions[agent.id];
                    if (!pos) return;

                    const energy = agent.growth?.energy || 50;
                    const currentZone = ZONES.find(z => z.id === pos.zone);

                    // Determine state based on zone and energy
                    if (energy < 30) {
                        newStates[agent.id] = 'resting';
                    } else if (currentZone?.id === 'studio') {
                        newStates[agent.id] = 'creating';
                    } else if (currentZone?.id === 'market') {
                        newStates[agent.id] = 'trading';
                    } else if (currentZone?.id === 'forest') {
                        newStates[agent.id] = 'exploring';
                    } else if (currentZone?.id === 'mountain') {
                        newStates[agent.id] = 'learning';
                    } else if (agent.growth?.mood === 'joyful' || agent.growth?.mood === 'festive') {
                        newStates[agent.id] = 'celebrating';
                    } else if (energy > 60) {
                        newStates[agent.id] = 'working';
                    } else {
                        newStates[agent.id] = 'idle';
                    }
                });
                return newStates;
            });
        }
    }, [time?.tick, agents]);

    const getAgentsAtPosition = (x, y) => {
        return agents.filter(agent => {
            const pos = agentPositions[agent.id];
            return pos && pos.x === x && pos.y === y;
        });
    };

    const getZoneAtPosition = (x, y) => {
        return ZONES.find(zone => 
            Math.abs(zone.position.x - x) <= 0 && Math.abs(zone.position.y - y) <= 0
        );
    };

    const getAgentStateVisual = (agentId) => {
        const state = agentStates[agentId] || 'idle';
        return AGENT_STATES[state] || AGENT_STATES.idle;
    };

    return (
        <div className="relative">
            {/* Time & Mood Indicators */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {isNight ? (
                        <Moon className="w-5 h-5 text-blue-300" />
                    ) : (
                        <Sun className="w-5 h-5 text-yellow-300" />
                    )}
                    <span className="text-sm text-white/60">
                        {isNight ? 'Night' : 'Day'} • {time?.season || 'Spring'}
                    </span>
                </div>
                <div className="text-sm text-white/60">
                    Mood: <span className="capitalize">{mood || 'peaceful'}</span>
                </div>
            </div>

            {/* Grid */}
            <div 
                className="grid gap-2 transition-all duration-500" 
                style={{ 
                    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    filter: `saturate(${vibrance}) ${isNight ? 'brightness(0.7)' : 'brightness(1)'}`
                }}
            >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                    const x = idx % GRID_SIZE;
                    const y = Math.floor(idx / GRID_SIZE);
                    const agentsHere = getAgentsAtPosition(x, y);
                    const zone = getZoneAtPosition(x, y);

                    return (
                        <div
                            key={idx}
                            className={`relative aspect-square rounded-lg border transition-all duration-500 ${
                                isNight ? 'border-white/5' : 'border-white/10'
                            } ${
                                zone 
                                    ? `bg-gradient-to-br ${zone.color} ${zone.glow && !isNight ? 'shadow-lg shadow-pink-500/20' : ''} ${zone.glow && isNight ? 'shadow-2xl shadow-pink-500/40 animate-pulse' : ''}` 
                                    : 'bg-white/5'
                            } ${agentsHere.length > 0 ? 'ring-2 ring-purple-500/30' : ''}`}
                        >
                            {/* Zone Icon */}
                            {zone && (
                                <div className="absolute top-1 left-1">
                                    <zone.icon className={`w-4 h-4 ${isNight ? 'text-white/20' : 'text-white/30'}`} />
                                </div>
                            )}

                            {/* Zone Label */}
                            {zone && (
                                <div className="absolute bottom-1 left-1 right-1">
                                    <p className="text-[0.5rem] text-white/40 truncate">{zone.name}</p>
                                </div>
                            )}

                            {/* Agents */}
                            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-1">
                                {agentsHere.map(agent => {
                                    const stateVisual = getAgentStateVisual(agent.id);
                                    return (
                                        <div
                                            key={agent.id}
                                            className="relative"
                                            onMouseEnter={() => setHoveredAgent(agent)}
                                            onMouseLeave={() => setHoveredAgent(null)}
                                            onClick={() => onAgentClick?.(agent)}
                                        >
                                            <div className={`w-10 h-10 rounded-full ${stateVisual.color} 
                                                flex items-center justify-center cursor-pointer 
                                                hover:scale-125 transition-transform shadow-lg ${stateVisual.animation}
                                                border-2 border-white/30`}
                                            >
                                                <span className="text-sm">{stateVisual.emoji}</span>
                                            </div>
                                            {agent.growth?.energy < 30 && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hover Tooltip */}
            {hoveredAgent && (
                <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl border-white/20 p-4 z-50 max-w-sm">
                    <div className="text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{hoveredAgent.name}</h3>
                            <span className="text-xs text-white/60 capitalize">{hoveredAgent.role}</span>
                        </div>
                        
                        <div className="mb-2">
                            <span className="text-xs text-white/60">Current State: </span>
                            <span className="text-sm font-medium capitalize text-purple-300">
                                {agentStates[hoveredAgent.id] || 'idle'} {getAgentStateVisual(hoveredAgent.id).emoji}
                            </span>
                        </div>
                        
                        {hoveredAgent.growth && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Mood:</span>
                                    <span className="text-sm font-medium capitalize">{hoveredAgent.growth.mood}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Energy:</span>
                                    <span className={`text-sm font-medium ${getEnergyColor(hoveredAgent.growth.energy)}`}>
                                        {hoveredAgent.growth.energy}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Wisdom:</span>
                                    <span className="text-sm font-medium text-purple-400">{Math.floor(hoveredAgent.growth.wisdom)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/80">Experience:</span>
                                    <span className="text-sm font-medium text-blue-400">{hoveredAgent.growth.experience}</span>
                                </div>
                                
                                {hoveredAgent.growth.relationships && Object.keys(hoveredAgent.growth.relationships).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                        <span className="text-xs text-white/60">
                                            {Object.keys(hoveredAgent.growth.relationships).length} relationships
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                {ZONES.map(zone => {
                    const Icon = zone.icon;
                    return (
                        <div key={zone.id} className="flex items-center gap-2 text-xs text-white/60">
                            <Icon className="w-3 h-3" />
                            <span>{zone.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}