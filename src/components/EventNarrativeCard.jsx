import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Users, TrendingUp, Quote } from 'lucide-react';

export default function EventNarrativeCard({ event }) {
    const narrative = event.outcomes?.narrative;

    if (!narrative) return null;

    return (
        <Card className="bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-pink-900/30 backdrop-blur-xl border-purple-500/40">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-white">{narrative.title}</CardTitle>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            Chronicle
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Main Narrative */}
                <div className="prose prose-invert max-w-none">
                    <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm">
                        {narrative.narrative}
                    </div>
                </div>

                {/* Thematic Essence */}
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-start gap-3">
                        <Quote className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                        <div>
                            <p className="text-xs text-purple-300/60 mb-1">Thematic Essence</p>
                            <p className="text-sm text-purple-200 italic">"{narrative.thematic_essence}"</p>
                        </div>
                    </div>
                </div>

                {/* Key Moments */}
                {narrative.key_moments?.length > 0 && (
                    <div>
                        <p className="text-sm text-white/60 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Key Moments
                        </p>
                        <div className="space-y-2">
                            {narrative.key_moments.map((moment, idx) => (
                                <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="flex items-start gap-3">
                                        <Badge className="bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                                            {moment.agent}
                                        </Badge>
                                        <div className="flex-1">
                                            <p className="text-sm text-white/90 mb-1">{moment.moment}</p>
                                            <p className="text-xs text-green-300/80">→ {moment.impact}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Character Insights */}
                {narrative.character_insights?.length > 0 && (
                    <div>
                        <p className="text-sm text-white/60 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Character Growth
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {narrative.character_insights.map((insight, idx) => (
                                <div key={idx} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <p className="text-xs text-blue-300 font-medium mb-1">{insight.agent}</p>
                                    <p className="text-xs text-blue-200/90">{insight.growth}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Legacy */}
                <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                        <div>
                            <p className="text-xs text-amber-300/60 mb-1">Village Legacy</p>
                            <p className="text-sm text-amber-200">{narrative.legacy}</p>
                        </div>
                    </div>
                </div>

                {/* Meta */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-xs text-white/40">
                        Chronicled by Axi, Keeper of Village Memory
                    </p>
                    <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Generated
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}