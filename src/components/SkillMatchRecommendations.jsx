import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, TrendingUp, Users, Award, Target } from 'lucide-react';

export default function SkillMatchRecommendations({ matchData, onSelectAgent }) {
    if (!matchData) return null;

    const getRecommendationColor = (level) => {
        switch(level) {
            case 'excellent': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'good': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'development': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'acceptable': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'unavailable': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            default: return 'bg-red-500/10 text-red-400 border-red-500/20';
        }
    };

    const getRecommendationIcon = (level) => {
        switch(level) {
            case 'excellent':
            case 'good':
                return <CheckCircle className="w-4 h-4" />;
            case 'development':
                return <TrendingUp className="w-4 h-4" />;
            default:
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-light text-white">{matchData.summary.excellent_matches}</div>
                        <div className="text-xs text-green-400">Excellent Matches</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-light text-white">{matchData.summary.good_matches}</div>
                        <div className="text-xs text-blue-400">Good Matches</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-light text-white">{matchData.summary.development_opportunities}</div>
                        <div className="text-xs text-purple-400">Development Ops</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="pt-4">
                        <div className="text-2xl font-light text-white">{matchData.summary.average_skill_match}%</div>
                        <div className="text-xs text-gray-400">Avg Skill Match</div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Insights */}
            {matchData.ai_insights && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-400" />
                            Axi's Strategic Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-purple-300 mb-2">Team Composition</h4>
                            <p className="text-gray-300 text-sm">{matchData.ai_insights.team_composition_advice}</p>
                        </div>

                        {matchData.ai_insights.success_factors?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-green-300 mb-2">Success Factors</h4>
                                <ul className="space-y-1">
                                    {matchData.ai_insights.success_factors.map((factor, idx) => (
                                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            <span>{factor}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {matchData.ai_insights.potential_challenges?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-yellow-300 mb-2">Potential Challenges</h4>
                                <ul className="space-y-1">
                                    {matchData.ai_insights.potential_challenges.map((challenge, idx) => (
                                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                            <span>{challenge}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {matchData.ai_insights.mentorship_opportunities?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-blue-300 mb-2">Mentorship Opportunities</h4>
                                <ul className="space-y-1">
                                    {matchData.ai_insights.mentorship_opportunities.map((opp, idx) => (
                                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                                            <Users className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <span>{opp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Top Picks */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Recommended Agents
                    </CardTitle>
                    <CardDescription className="text-purple-300/60">
                        Best matches based on skills, performance, and availability
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {matchData.top_picks.map((agent, idx) => (
                            <Card key={agent.agent_id} className="bg-white/5 border-white/10">
                                <CardContent className="pt-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="text-lg font-medium text-white">
                                                    #{idx + 1} {agent.agent_name}
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {agent.agent_role}
                                                </Badge>
                                                <Badge className={getRecommendationColor(agent.recommendation_level)}>
                                                    {getRecommendationIcon(agent.recommendation_level)}
                                                    <span className="ml-1">{agent.recommendation_level}</span>
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">{agent.recommendation_reason}</p>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">Overall Match</span>
                                                    <span className="text-white font-medium">{agent.overall_score}/100</span>
                                                </div>
                                                <Progress value={agent.overall_score} className="h-2" />
                                            </div>
                                        </div>
                                        {onSelectAgent && agent.recommendation_level !== 'unavailable' && (
                                            <Button 
                                                onClick={() => onSelectAgent(agent)}
                                                size="sm"
                                                className="ml-4 bg-purple-600 hover:bg-purple-700"
                                            >
                                                Assign
                                            </Button>
                                        )}
                                    </div>

                                    {/* Skill Breakdown */}
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="text-xs">
                                            <div className="text-gray-400 mb-1">Skill Match</div>
                                            <div className="text-white font-medium">{agent.breakdown.skill_match_percentage}%</div>
                                        </div>
                                        <div className="text-xs">
                                            <div className="text-gray-400 mb-1">Reliability</div>
                                            <div className="text-white font-medium">{agent.breakdown.reliability_score}/100</div>
                                        </div>
                                        <div className="text-xs">
                                            <div className="text-gray-400 mb-1">Performance</div>
                                            <div className="text-white font-medium">{agent.breakdown.performance_score}/100</div>
                                        </div>
                                        <div className="text-xs">
                                            <div className="text-gray-400 mb-1">Availability</div>
                                            <div className="text-white font-medium">{agent.breakdown.availability_score}/100</div>
                                        </div>
                                    </div>

                                    {/* Skills Details */}
                                    {agent.skills.met.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-xs text-green-400 mb-1">✓ Skills Met</div>
                                            <div className="flex flex-wrap gap-1">
                                                {agent.skills.met.map((skill, sidx) => (
                                                    <Badge key={sidx} variant="outline" className="text-xs text-green-400 border-green-500/30">
                                                        {skill.skill} (L{skill.agent_level})
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {agent.skills.partial.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-xs text-yellow-400 mb-1">⚡ Partial Skills</div>
                                            <div className="flex flex-wrap gap-1">
                                                {agent.skills.partial.map((skill, sidx) => (
                                                    <Badge key={sidx} variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">
                                                        {skill.skill} (L{skill.agent_level}/{skill.required_level})
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {agent.skills.in_development.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-xs text-purple-400 mb-1">📚 In Development</div>
                                            <div className="flex flex-wrap gap-1">
                                                {agent.skills.in_development.map((skill, sidx) => (
                                                    <Badge key={sidx} variant="outline" className="text-xs text-purple-400 border-purple-500/30">
                                                        {skill.skill} ({skill.progress}%)
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {agent.skills.missing.length > 0 && (
                                        <div>
                                            <div className="text-xs text-red-400 mb-1">⚠ Missing Skills</div>
                                            <div className="flex flex-wrap gap-1">
                                                {agent.skills.missing.map((skill, sidx) => (
                                                    <Badge key={sidx} variant="outline" className="text-xs text-red-400 border-red-500/30">
                                                        {skill.skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}