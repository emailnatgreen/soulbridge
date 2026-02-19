import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mountain, AlertTriangle, Gift, BookOpen, Zap, Sun } from 'lucide-react';

export default function WorldEventCard({ event }) {
    const categoryIcons = {
        environmental: Mountain,
        resource_discovery: Gift,
        natural_phenomenon: Zap,
        emergent_threat: AlertTriangle,
        opportunity: Sparkles,
        lore_revelation: BookOpen,
        seasonal_change: Sun
    };

    const categoryColors = {
        environmental: 'bg-green-500/10 text-green-400 border-green-500/20',
        resource_discovery: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        natural_phenomenon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        emergent_threat: 'bg-red-500/10 text-red-400 border-red-500/20',
        opportunity: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        lore_revelation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        seasonal_change: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    };

    const impactColors = {
        minor: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        moderate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        major: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        critical: 'bg-red-500/10 text-red-400 border-red-500/20'
    };

    const IconComponent = categoryIcons[event.event_category] || Sparkles;

    return (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl border-purple-500/30 hover:border-purple-500/50 transition-all">
            <CardHeader>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <IconComponent className="w-5 h-5 text-purple-400" />
                        </div>
                        <CardTitle className="text-white">{event.title}</CardTitle>
                    </div>
                    <Badge className={`${categoryColors[event.event_category]} border text-xs`}>
                        {event.event_category.replace(/_/g, ' ')}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Badge className={`${impactColors[event.impact_level]} border text-xs`}>
                        {event.impact_level} impact
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {event.status}
                    </Badge>
                    {event.duration_ticks > 0 && (
                        <Badge variant="outline" className="text-xs">
                            {event.duration_ticks} ticks
                        </Badge>
                    )}
                    {event.duration_ticks === 0 && (
                        <Badge variant="outline" className="text-xs text-purple-400">
                            Permanent
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        {event.description}
                    </p>
                </div>

                {event.lore_context && (
                    <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <p className="text-xs text-cyan-300/60 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Lore
                        </p>
                        <p className="text-xs text-cyan-300/90">{event.lore_context}</p>
                    </div>
                )}

                {event.world_changes && (
                    <div className="space-y-2">
                        {event.world_changes.new_resources?.length > 0 && (
                            <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                                <p className="text-xs text-amber-400 font-medium mb-1">New Resources:</p>
                                {event.world_changes.new_resources.map((res, idx) => (
                                    <p key={idx} className="text-xs text-amber-300/80">• {res.name}</p>
                                ))}
                            </div>
                        )}
                        {event.world_changes.new_locations?.length > 0 && (
                            <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                                <p className="text-xs text-green-400 font-medium mb-1">New Locations:</p>
                                {event.world_changes.new_locations.map((loc, idx) => (
                                    <p key={idx} className="text-xs text-green-300/80">• {loc.name}</p>
                                ))}
                            </div>
                        )}
                        {event.world_changes.threats?.length > 0 && (
                            <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                                <p className="text-xs text-red-400 font-medium mb-1">Threats:</p>
                                {event.world_changes.threats.map((threat, idx) => (
                                    <p key={idx} className="text-xs text-red-300/80">
                                        • {threat.name} ({threat.severity})
                                    </p>
                                ))}
                            </div>
                        )}
                        {event.world_changes.environment_modifiers && Object.keys(event.world_changes.environment_modifiers).length > 0 && (
                            <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                                <p className="text-xs text-blue-400 font-medium mb-1">Environment Changes:</p>
                                {Object.entries(event.world_changes.environment_modifiers).map(([key, value], idx) => (
                                    <p key={idx} className="text-xs text-blue-300/80">
                                        • {key}: {value}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}