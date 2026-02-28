import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingUp, Target, Users, Award, BookOpen, ArrowRight, Brain, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import SkillGapAlertsPanel from '@/components/SkillGapAlertsPanel';

export default function SkillGapAnalysis() {
    const [analysisType, setAnalysisType] = useState('comprehensive');
    const [selectedRole, setSelectedRole] = useState('all');
    const [runningAuto, setRunningAuto] = useState(false);

    const { data: analysisData, isLoading, refetch } = useQuery({
        queryKey: ['skillGapAnalysis', analysisType, selectedRole],
        queryFn: async () => {
            const payload = {
                analysis_type: analysisType,
                ...(selectedRole !== 'all' && { role_type: selectedRole })
            };
            const response = await base44.functions.invoke('analyzeSkillGaps', payload);
            return response.data;
        }
    });

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const getReadinessColor = (level) => {
        switch(level) {
            case 'ready': return 'text-green-400';
            case 'developing': return 'text-yellow-400';
            case 'needs_support': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-white">Analyzing skill gaps...</div>
                    </div>
                </div>
            </div>
        );
    }

    const insights = analysisData?.village_insights;
    const agentAnalysis = analysisData?.agent_analysis || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
                            ← Back to Village
                        </Button>
                    </Link>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8 text-purple-400" />
                            <h1 className="text-3xl font-light text-white">Skill Gap Analysis</h1>
                        </div>
                        <Button 
                            onClick={() => refetch()} 
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Refresh Analysis
                        </Button>
                    </div>
                    <p className="text-purple-300/60">AI-powered skill assessment and development recommendations</p>
                </div>

                {/* Filters */}
                <Card className="bg-white/5 border-white/10 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="guardian">Guardian</SelectItem>
                                    <SelectItem value="creator">Creator</SelectItem>
                                    <SelectItem value="trader">Trader</SelectItem>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="healer">Healer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Village Overview */}
                {insights && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-purple-300/80">Average Readiness</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-light text-white mb-2">
                                    {Math.round(insights.average_readiness)}%
                                </div>
                                <Progress value={insights.average_readiness} className="h-2" />
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-green-300/80">Agents Ready</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-light text-white">
                                    {insights.agents_ready}
                                    <span className="text-lg text-gray-400 ml-2">
                                        / {insights.total_agents_analyzed}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-yellow-300/80">Developing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-light text-white">{insights.agents_developing}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-red-300/80">Need Support</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-light text-white">{insights.agents_need_support}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Village Insights */}
                {insights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                                    Most Common Skill Gaps
                                </CardTitle>
                                <CardDescription className="text-purple-300/60">
                                    Skills requiring Village-wide development
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {insights.most_common_gaps.map((gap, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                            <div>
                                                <div className="text-white font-medium">{gap.skill}</div>
                                                <div className="text-sm text-gray-400">
                                                    {gap.affected_agents} agent(s) • Avg gap: {gap.average_gap} levels
                                                </div>
                                            </div>
                                            <Link to={createPageUrl('SkillDevelopment')}>
                                                <Button size="sm" variant="ghost" className="text-purple-400">
                                                    Develop <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-green-400" />
                                    Village Strengths
                                </CardTitle>
                                <CardDescription className="text-purple-300/60">
                                    Most developed skills across the Village
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {insights.most_developed_skills.map((skill, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                            <div>
                                                <div className="text-white font-medium">{skill.skill}</div>
                                                <div className="text-sm text-green-400">
                                                    {skill.proficient_agents} proficient agent(s)
                                                </div>
                                            </div>
                                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                                Strength
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Agent Analysis */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" />
                            Individual Agent Analysis
                        </CardTitle>
                        <CardDescription className="text-purple-300/60">
                            Detailed skill gap breakdown per agent
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {agentAnalysis.map((agent) => (
                                <Card key={agent.agent_id} className="bg-white/5 border-white/10">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-white text-lg">{agent.agent_name}</CardTitle>
                                                <CardDescription className="text-purple-300/60">
                                                    {agent.agent_role} • Readiness: 
                                                    <span className={`ml-2 font-semibold ${getReadinessColor(agent.readiness_level)}`}>
                                                        {agent.readiness_score}%
                                                    </span>
                                                </CardDescription>
                                            </div>
                                            <Badge className={
                                                agent.readiness_level === 'ready' 
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : agent.readiness_level === 'developing'
                                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }>
                                                {agent.readiness_level.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Tabs defaultValue="gaps" className="w-full">
                                            <TabsList className="bg-white/5 border-white/10">
                                                <TabsTrigger value="gaps">
                                                    Gaps ({agent.gaps.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="strengths">
                                                    Strengths ({agent.strengths.length})
                                                </TabsTrigger>
                                                <TabsTrigger value="recommendations">
                                                    Actions ({agent.recommendations.length})
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="gaps" className="space-y-3 mt-4">
                                                {agent.gaps.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-400">
                                                        No skill gaps identified! 🎉
                                                    </div>
                                                ) : (
                                                    agent.gaps.map((gap, idx) => (
                                                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex-1">
                                                                    <div className="text-white font-medium mb-1">{gap.skill}</div>
                                                                    <div className="text-sm text-gray-400">
                                                                        Current: Level {gap.current_level} → Target: Level {gap.required_level}
                                                                    </div>
                                                                    {gap.in_development && (
                                                                        <div className="mt-2">
                                                                            <div className="text-xs text-green-400 mb-1">
                                                                                In Development ({gap.development_progress}%)
                                                                            </div>
                                                                            <Progress value={gap.development_progress} className="h-1" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Badge className={getSeverityColor(gap.gap_severity)}>
                                                                    {gap.gap_severity}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </TabsContent>

                                            <TabsContent value="strengths" className="space-y-3 mt-4">
                                                {agent.strengths.map((strength, idx) => (
                                                    <div key={idx} className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-white font-medium">{strength.skill}</div>
                                                                <div className="text-sm text-green-400">
                                                                    Level {strength.current_level} (Required: {strength.required_level})
                                                                </div>
                                                            </div>
                                                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                                                {strength.proficiency}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </TabsContent>

                                            <TabsContent value="recommendations" className="space-y-3 mt-4">
                                                {agent.recommendations.map((rec, idx) => (
                                                    <div key={idx} className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                                                        <div className="flex items-start gap-3">
                                                            <Target className="w-5 h-5 text-purple-400 mt-0.5" />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Badge className={
                                                                        rec.priority === 'urgent' 
                                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                            : rec.priority === 'high'
                                                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                    }>
                                                                        {rec.priority}
                                                                    </Badge>
                                                                    <span className="text-white font-medium">{rec.action.replace('_', ' ')}</span>
                                                                </div>
                                                                <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                                                                {rec.suggested_skills.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {rec.suggested_skills.map((skill, i) => (
                                                                            <Badge key={i} variant="outline" className="text-xs">
                                                                                {skill}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}