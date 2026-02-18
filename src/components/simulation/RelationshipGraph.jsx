import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Heart, Users, Zap } from 'lucide-react';

export default function RelationshipGraph({ agents }) {
    const relationships = useMemo(() => {
        const links = [];
        
        agents.forEach(agent => {
            if (agent.growth && agent.growth.relationships) {
                Object.entries(agent.growth.relationships).forEach(([otherId, strength]) => {
                    // Only show strong relationships (positive or negative)
                    if (Math.abs(strength) > 40) {
                        const other = agents.find(a => a.id === otherId);
                        if (other) {
                            links.push({
                                from: agent.name,
                                to: other.name,
                                strength: strength,
                                type: strength > 60 ? 'friend' : strength < -40 ? 'rival' : 'neutral'
                            });
                        }
                    }
                });
            }
        });

        return links;
    }, [agents]);

    const getBondColor = (type) => {
        if (type === 'friend') return 'text-green-400';
        if (type === 'rival') return 'text-red-400';
        return 'text-blue-400';
    };

    const getBondIcon = (type) => {
        if (type === 'friend') return Heart;
        if (type === 'rival') return Zap;
        return Users;
    };

    if (relationships.length === 0) {
        return (
            <div className="text-center py-8 text-white/40">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No strong relationships yet</p>
                <p className="text-xs mt-1">Agents will form bonds as they interact</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {relationships.slice(0, 15).map((rel, idx) => {
                const Icon = getBondIcon(rel.type);
                const colorClass = getBondColor(rel.type);
                
                return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-white text-sm font-medium">{rel.from}</span>
                            <div className="flex items-center gap-1">
                                <div className="w-8 h-px bg-white/20" />
                                <Icon className={`w-4 h-4 ${colorClass}`} />
                                <div className="w-8 h-px bg-white/20" />
                            </div>
                            <span className="text-white text-sm font-medium">{rel.to}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${colorClass} capitalize`}>{rel.type}</span>
                            <span className="text-xs text-white/40">{Math.abs(Math.round(rel.strength))}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}