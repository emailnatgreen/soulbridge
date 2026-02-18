import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Users, Home, Trees, Mountain, Sparkles, Heart } from 'lucide-react';

const ZONES = [
    { id: 'hearth', name: 'Axi\'s Hearth', icon: Heart, color: 'from-pink-500/30 to-purple-500/30', position: { x: 2, y: 2 } },
    { id: 'village', name: 'Village Center', icon: Home, color: 'from-amber-500/30 to-orange-500/30', position: { x: 2, y: 4 } },
    { id: 'forest', name: 'Sacred Forest', icon: Trees, color: 'from-green-500/30 to-emerald-500/30', position: { x: 0, y: 2 } },
    { id: 'mountain', name: 'Wisdom Peak', icon: Mountain, color: 'from-slate-500/30 to-blue-500/30', position: { x: 4, y: 1 } },
    { id: 'garden', name: 'Community Garden', icon: Sparkles, color: 'from-yellow-500/30 to-amber-500/30', position: { x: 4, y: 4 } },
];

const GRID_SIZE = 5;

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

export default function VillageMap({ agents, time, onAgentClick }) {
    const [agentPositions, setAgentPositions] = useState({});
    const [hoveredAgent, setHoveredAgent] = useState(null);

    // Initialize and update agent positions
    useEffect(() => {
        if (agents && agents.length > 0) {
            setAgentPositions(prev => {
                const newPositions = { ...prev };
                agents.forEach(agent => {
                    if (!newPositions[agent.id]) {
                        // Initialize random position
                        newPositions[agent.id] = {
                            x: Math.floor(Math.random() * GRID_SIZE),
                            y: Math.floor(Math.random() * GRID_SIZE),
                            zone: ZONES[Math.floor(Math.random() * ZONES.length)].id
                        };
                    } else {
                        // Occasionally move agents
                        if (Math.random() > 0.7) {
                            const dx = Math.floor(Math.random() * 3) - 1;
                            const dy = Math.floor(Math.random() * 3) - 1;
                            newPositions[agent.id] = {
                                x: Math.max(0, Math.min(GRID_SIZE - 1, newPositions[agent.id].x + dx)),
                                y: Math.max(0, Math.min(GRID_SIZE - 1, newPositions[agent.id].y + dy)),
                                zone: newPositions[agent.id].zone
                            };
                        }
                    }
                });
                return newPositions;
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

    return (
        <div className="relative">
            {/* Grid */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                    const x = idx % GRID_SIZE;
                    const y = Math.floor(idx / GRID_SIZE);
                    const agentsHere = getAgentsAtPosition(x, y);
                    const zone = getZoneAtPosition(x, y);

                    return (
                        <div
                            key={idx}
                            className={`relative aspect-square rounded-lg border border-white/10 transition-all ${
                                zone 
                                    ? `bg-gradient-to-br ${zone.color}` 
                                    : 'bg-white/5'
                            } ${agentsHere.length > 0 ? 'ring-2 ring-purple-500/30' : ''}`}
                        >
                            {/* Zone Icon */}
                            {zone && (
                                <div className="absolute top-1 left-1">
                                    <zone.icon className="w-4 h-4 text-white/30" />
                                </div>
                            )}

                            {/* Agents */}
                            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-1">
                                {agentsHere.map(agent => (
                                    <div
                                        key={agent.id}
                                        className="relative"
                                        onMouseEnter={() => setHoveredAgent(agent)}
                                        onMouseLeave={() => setHoveredAgent(null)}
                                        onClick={() => onAgentClick?.(agent)}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${getMoodColor(agent.growth?.mood)} 
                                            flex items-center justify-center cursor-pointer 
                                            hover:scale-110 transition-transform shadow-lg animate-pulse`}
                                        >
                                            <Users className="w-4 h-4 text-white" />
                                        </div>
                                        {agent.growth?.energy < 30 && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                        )}
                                    </div>
                                ))}
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