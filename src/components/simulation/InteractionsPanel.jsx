import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, Zap, Gift, MessageCircle, AlertTriangle } from 'lucide-react';

const getInteractionIcon = (type) => {
    const icons = {
        social: MessageCircle,
        trade: Gift,
        cooperative: Users,
        bond_formed: Heart,
        milestone: Zap
    };
    return icons[type] || MessageCircle;
};

const getInteractionColor = (effect) => {
    if (effect === 'positive') return 'text-green-400';
    if (effect === 'negative') return 'text-orange-400';
    return 'text-blue-400';
};

export default function InteractionsPanel({ interactions, agents }) {
    if (!interactions || interactions.length === 0) {
        return (
            <div className="text-center py-8 text-white/40">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No recent interactions</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {interactions.map((interaction, idx) => {
                const Icon = getInteractionIcon(interaction.type);
                const colorClass = getInteractionColor(interaction.effect);
                
                return (
                    <div 
                        key={idx} 
                        className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                                interaction.effect === 'positive' ? 'bg-green-500/20' :
                                interaction.effect === 'negative' ? 'bg-orange-500/20' :
                                'bg-blue-500/20'
                            }`}>
                                <Icon className={`w-4 h-4 ${colorClass}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-sm">{interaction.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-white/40 capitalize">{interaction.type}</span>
                                    {interaction.subtype && (
                                        <>
                                            <span className="text-xs text-white/20">•</span>
                                            <span className="text-xs text-white/40 capitalize">{interaction.subtype}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}