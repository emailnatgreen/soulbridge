import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Lightbulb, TrendingUp, User } from 'lucide-react';

export default function WhatIfScenarioCard({ scenario, index }) {
    if (!scenario) return null;

    const probabilityColors = {
        high: 'bg-green-500/30 text-green-300',
        medium: 'bg-yellow-500/30 text-yellow-300',
        low: 'bg-red-500/30 text-red-300'
    };

    return (
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-200 flex items-center gap-2 text-base">
                        <GitBranch className="w-5 h-5 text-cyan-400" />
                        What If #{index + 1}: {scenario.title}
                    </CardTitle>
                    <Badge className={probabilityColors[scenario.probability]}>
                        {scenario.probability} likelihood
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Alternative Decision */}
                <div className="p-3 bg-cyan-500/10 rounded border border-cyan-500/20">
                    <h5 className="text-cyan-300 text-sm font-medium mb-1">Alternative Decision</h5>
                    <p className="text-white/80 text-sm">{scenario.alternative_decision}</p>
                </div>

                {/* Decision Maker & Character Alignment */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-white/5 rounded">
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-white/60">Decision Maker</span>
                        </div>
                        <p className="text-white text-sm font-medium">{scenario.decision_maker}</p>
                    </div>
                    <div className="p-2 bg-white/5 rounded">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-white/60">Character Fit</span>
                        </div>
                        <p className="text-white/80 text-xs">{scenario.character_alignment}</p>
                    </div>
                </div>

                {/* Ripple Effects */}
                <div>
                    <h5 className="text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Ripple Effects
                    </h5>
                    <ul className="space-y-1">
                        {scenario.ripple_effects.map((effect, idx) => (
                            <li key={idx} className="text-white/70 text-sm flex items-start gap-2">
                                <span className="text-blue-400 mt-1">→</span>
                                <span>{effect}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Alternative Outcomes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                        <h6 className="text-green-300 text-xs font-medium mb-1">Immediate Impact</h6>
                        <p className="text-white/70 text-xs">{scenario.alternative_outcomes.immediate}</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
                        <h6 className="text-purple-300 text-xs font-medium mb-1">Long-term Impact</h6>
                        <p className="text-white/70 text-xs">{scenario.alternative_outcomes.long_term}</p>
                    </div>
                </div>

                {/* Lessons Learned */}
                <div className="p-3 bg-amber-500/10 rounded border border-amber-500/20">
                    <h5 className="text-amber-300 text-sm font-medium mb-2">Lessons Learned</h5>
                    <ul className="space-y-1">
                        {scenario.lessons_learned.map((lesson, idx) => (
                            <li key={idx} className="text-white/70 text-xs flex items-start gap-2">
                                <span className="text-amber-400">💡</span>
                                <span>{lesson}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}