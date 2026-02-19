import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, BookOpen, TrendingUp, ChevronDown, ChevronUp, Award } from 'lucide-react';

export default function AgentFeedbackCard({ feedback }) {
    const [expanded, setExpanded] = useState(false);

    if (!feedback) return null;

    const gradeColors = {
        'A+': 'text-green-400 bg-green-500/20',
        'A': 'text-green-300 bg-green-500/20',
        'A-': 'text-green-200 bg-green-500/20',
        'B+': 'text-blue-400 bg-blue-500/20',
        'B': 'text-blue-300 bg-blue-500/20',
        'B-': 'text-blue-200 bg-blue-500/20',
        'C+': 'text-yellow-400 bg-yellow-500/20',
        'C': 'text-yellow-300 bg-yellow-500/20',
        'C-': 'text-orange-300 bg-orange-500/20'
    };

    return (
        <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-indigo-300 flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        {feedback.agent_name}'s Performance Review
                    </CardTitle>
                    <Badge className={`${gradeColors[feedback.overall_grade] || 'bg-gray-500/20'} text-lg px-3 py-1`}>
                        {feedback.overall_grade}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Performance Summary */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/90 text-sm leading-relaxed">{feedback.performance_summary}</p>
                </div>

                {/* XP Gained */}
                <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-white/80">Experience Gained:</span>
                    <span className="text-green-400 font-semibold">+{feedback.experience_gained} XP</span>
                </div>

                {/* Strengths */}
                <div>
                    <h4 className="text-green-300 text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Strengths Demonstrated
                    </h4>
                    <ul className="space-y-1">
                        {feedback.strengths.map((strength, idx) => (
                            <li key={idx} className="text-white/70 text-sm flex items-start gap-2">
                                <span className="text-green-400 mt-1">•</span>
                                <span>{strength}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Areas for Improvement */}
                <div>
                    <h4 className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                        {feedback.areas_for_improvement.map((area, idx) => (
                            <li key={idx} className="text-white/70 text-sm flex items-start gap-2">
                                <span className="text-yellow-400 mt-1">•</span>
                                <span>{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Expandable Section */}
                <Button
                    variant="ghost"
                    onClick={() => setExpanded(!expanded)}
                    className="w-full text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Hide Detailed Recommendations
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Show Detailed Recommendations
                        </>
                    )}
                </Button>

                {expanded && (
                    <div className="space-y-4 pt-2">
                        {/* Recommended Training */}
                        <div>
                            <h4 className="text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Recommended Training
                            </h4>
                            <div className="space-y-2">
                                {feedback.recommended_training.map((training, idx) => (
                                    <div key={idx} className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white font-medium text-sm">{training.module}</span>
                                            <Badge className={`text-xs ${
                                                training.priority === 'high' ? 'bg-red-500/30 text-red-300' :
                                                training.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                                'bg-green-500/30 text-green-300'
                                            }`}>
                                                {training.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-white/60 text-xs">{training.rationale}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Diplomatic Guidance */}
                        {feedback.diplomatic_guidance && (
                            <div>
                                <h4 className="text-purple-300 text-sm font-medium mb-2">Diplomatic Guidance</h4>
                                <p className="text-white/70 text-sm p-3 bg-purple-500/10 rounded border border-purple-500/20">
                                    {feedback.diplomatic_guidance}
                                </p>
                            </div>
                        )}

                        {/* Skill Development Path */}
                        <div>
                            <h4 className="text-cyan-300 text-sm font-medium mb-2">Next Skills to Develop</h4>
                            <div className="flex flex-wrap gap-2">
                                {feedback.skill_development_path.map((skill, idx) => (
                                    <Badge key={idx} className="bg-cyan-500/20 text-cyan-300">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}