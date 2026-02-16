import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Package, Wallet } from 'lucide-react';
import moment from 'moment';

export default function EconomyPanel({ agentId }) {
    const { data: activities = [] } = useQuery({
        queryKey: ['economic-activities', agentId],
        queryFn: () => base44.entities.EconomicActivity.filter(
            { agent_id: agentId },
            '-created_date',
            50
        ),
    });

    const { data: resources = [] } = useQuery({
        queryKey: ['agent-resources', agentId],
        queryFn: () => base44.entities.Resource.filter({
            owner_agent_id: agentId
        }),
    });

    const earnings = activities.filter(a => a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
    const spent = activities.filter(a => a.activity_type === 'spent').reduce((sum, a) => sum + a.amount, 0);
    const traded = activities.filter(a => a.activity_type === 'traded').reduce((sum, a) => sum + a.amount, 0);

    const getActivityColor = (type) => {
        const colors = {
            earned: 'bg-green-500/10 text-green-300 border-green-500/20',
            spent: 'bg-red-500/10 text-red-300 border-red-500/20',
            traded: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            treasury_deposit: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
            treasury_withdrawal: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
            resource_acquired: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
            resource_sold: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
        };
        return colors[type] || 'bg-white/5 text-white/60 border-white/10';
    };

    const getResourceRarityColor = (rarity) => {
        const colors = {
            common: 'bg-gray-500/10 text-gray-300',
            uncommon: 'bg-green-500/10 text-green-300',
            rare: 'bg-blue-500/10 text-blue-300',
            epic: 'bg-purple-500/10 text-purple-300',
            legendary: 'bg-yellow-500/10 text-yellow-300'
        };
        return colors[rarity] || colors.common;
    };

    return (
        <div className="space-y-6">
            {/* Economy Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-green-300/80">Total Earned</CardTitle>
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-light text-white">{earnings} XRP</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-red-300/80">Total Spent</CardTitle>
                            <DollarSign className="w-5 h-5 text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-light text-white">{spent} XRP</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-blue-300/80">Resources Held</CardTitle>
                            <Package className="w-5 h-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-light text-white">{resources.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Resources Owned */}
            {resources.length > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-cyan-400" />
                            Owned Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {resources.map(resource => (
                                <div key={resource.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-white font-medium">{resource.name}</p>
                                            <p className="text-xs text-white/60 capitalize">{resource.type}</p>
                                        </div>
                                        <Badge className={getResourceRarityColor(resource.rarity)}>
                                            {resource.rarity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-white/80 mb-2">{resource.description}</p>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/60">Value: {resource.xrp_value} XRP</span>
                                        {resource.quantity && (
                                            <span className="text-purple-300">Qty: {resource.quantity}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Activity Log */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        Economic Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-white/40">No economic activities yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {activities.slice(0, 20).map(activity => (
                                <div key={activity.id} className={`rounded-lg p-3 border ${getActivityColor(activity.activity_type)}`}>
                                    <div className="flex items-start justify-between mb-1">
                                        <span className="text-xs font-medium capitalize">{activity.activity_type}</span>
                                        <span className="text-xs">{moment(activity.created_date).fromNow()}</span>
                                    </div>
                                    <p className="text-sm text-white/90">{activity.description}</p>
                                    <p className="text-xs text-white/60 mt-1">{activity.amount} XRP</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}