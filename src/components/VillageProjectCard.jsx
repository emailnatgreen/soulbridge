import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function VillageProjectCard({ project, onContribute }) {
    const { data: creator } = useQuery({
        queryKey: ['agent', project.creator_agent_id],
        queryFn: () => base44.entities.Agent.get(project.creator_agent_id),
    });

    const getCategoryColor = (category) => {
        const colors = {
            infrastructure: 'bg-blue-500/10 text-blue-300',
            research: 'bg-purple-500/10 text-purple-300',
            community: 'bg-pink-500/10 text-pink-300',
            resource: 'bg-amber-500/10 text-amber-300'
        };
        return colors[category] || colors.community;
    };

    const getStatusColor = (status) => {
        const colors = {
            planning: 'bg-slate-500/10 text-slate-300',
            active: 'bg-green-500/10 text-green-300',
            completed: 'bg-emerald-500/10 text-emerald-300',
            abandoned: 'bg-red-500/10 text-red-300'
        };
        return colors[status] || colors.planning;
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <CardTitle className="text-white mb-2">{project.name}</CardTitle>
                        <p className="text-sm text-white/60 mb-3">{project.description}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Badge className={getCategoryColor(project.category)}>
                            {project.category}
                        </Badge>
                        <Badge className={getStatusColor(project.status)}>
                            {project.status}
                        </Badge>
                    </div>
                </div>

                {creator && (
                    <p className="text-xs text-white/40">
                        Created by {creator.name}
                    </p>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-white/60">Progress</p>
                        <p className="text-sm font-medium text-white">{project.progress_percentage}%</p>
                    </div>
                    <Progress value={project.progress_percentage} className="h-2" />
                </div>

                {/* Resource Requirements */}
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-white/40">Resources Needed</p>
                    {project.required_resources && Object.entries(project.required_resources).map(([type, amount]) => {
                        const gathered = project.resources_gathered?.[type] || 0;
                        const percent = Math.round((gathered / amount) * 100);
                        return (
                            <div key={type} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/60 capitalize">{type}</span>
                                    <span className="text-white">{gathered}/{amount}</span>
                                </div>
                                <Progress value={percent} className="h-1" />
                            </div>
                        );
                    })}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-white/40 text-xs">Contributors</p>
                        <p className="text-white flex items-center justify-center gap-1 mt-1">
                            <Users className="w-3 h-3" />
                            {project.contributors?.length || 0}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-white/40 text-xs">Reward</p>
                        <p className="text-amber-300 flex items-center justify-center gap-1 mt-1">
                            <Zap className="w-3 h-3" />
                            {project.reward_xrp} XRP
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-white/40 text-xs">Target</p>
                        <p className="text-white text-xs mt-1">
                            {project.target_completion_date ? moment(project.target_completion_date).format('MMM DD') : 'No date'}
                        </p>
                    </div>
                </div>

                {project.status !== 'completed' && project.status !== 'abandoned' && (
                    <Button
                        onClick={() => onContribute(project.id)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        <Target className="w-4 h-4 mr-2" />
                        Contribute
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}