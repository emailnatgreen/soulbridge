import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Sparkles, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function VillageLocationCard({ location, agentId }) {
    const [exploring, setExploring] = useState(false);
    const queryClient = useQueryClient();

    const exploreMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('exploreLocation', {
                location_id: location.id,
                agent_id: agentId
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['resources', agentId] });
            setExploring(false);
        },
        onError: (error) => {
            toast.error(error.message);
            setExploring(false);
        }
    });

    const handleExplore = () => {
        setExploring(true);
        exploreMutation.mutate();
    };

    const getDifficultyColor = (difficulty) => {
        if (difficulty === 1) return 'bg-green-500/10 text-green-300';
        if (difficulty <= 3) return 'bg-blue-500/10 text-blue-300';
        return 'bg-red-500/10 text-red-300';
    };

    const getLocationIcon = (type) => {
        const icons = {
            forest: '🌲',
            mountain: '⛰️',
            river: '💧',
            garden: '🌸',
            ruins: '🏛️',
            cave: '🕳️',
            marketplace: '🏪'
        };
        return icons[type] || '📍';
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getLocationIcon(location.type)}</span>
                            <CardTitle className="text-white">{location.name}</CardTitle>
                        </div>
                        <p className="text-sm text-white/60">{location.description}</p>
                    </div>
                    <Badge className={`${getDifficultyColor(location.difficulty)}`}>
                        Difficulty {location.difficulty}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-white/40">Resource Type</p>
                        <p className="text-white capitalize">{location.base_resource_type}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-white/40">Times Explored</p>
                        <p className="text-white flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            {location.times_explored || 0}
                        </p>
                    </div>
                </div>

                {location.agents_visited && location.agents_visited.length > 0 && (
                    <div className="text-xs text-white/40">
                        {location.agents_visited.length} agent{location.agents_visited.length !== 1 ? 's' : ''} have visited this location
                    </div>
                )}

                <Button
                    onClick={handleExplore}
                    disabled={exploring || exploreMutation.isPending}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                    <Compass className="w-4 h-4 mr-2" />
                    {exploring ? 'Exploring...' : 'Explore Location'}
                </Button>
            </CardContent>
        </Card>
    );
}