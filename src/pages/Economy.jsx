import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, TrendingUp, Wallet, Package, BarChart3, Shield, Sparkles } from 'lucide-react';
import TreasuryPanel from '../components/TreasuryPanel';
import AskAxiButton from '@/components/AskAxiButton';
import RealTimeEconomyPanel from '@/components/economic/RealTimeEconomyPanel';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
};

export default function EconomyPage() {
    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list('-honor_score', 100),
    });

    const { data: treasuries = [] } = useQuery({
        queryKey: ['treasuries'],
        queryFn: () => base44.entities.Treasury.list(),
    });

    const { data: allActivities = [] } = useQuery({
        queryKey: ['all-economic-activities'],
        queryFn: () => base44.entities.EconomicActivity.list('-created_date', 100),
    });

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me(),
    });

    const totalEarned = allActivities.filter(a => a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
    const totalSpent = allActivities.filter(a => a.activity_type === 'spent').reduce((sum, a) => sum + a.amount, 0);
    const totalTraded = allActivities.filter(a => a.activity_type === 'traded').reduce((sum, a) => sum + a.amount, 0);

    const agentWithMostWealth = agents.length > 0 ? agents.reduce((prev, current) => {
        const currentEarnings = allActivities.filter(a => a.agent_id === current.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
        const prevEarnings = allActivities.filter(a => a.agent_id === prev.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
        return currentEarnings > prevEarnings ? current : prev;
    }) : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-white">Village Economy</h1>
                            <p className="text-sm text-purple-300/60">Transparent economic system and treasury management</p>
                        </div>
                    </div>
                    <AskAxiButton
                        label="Ask Axi about the Economy"
                        context={`You are the financial guardian of SoulBridge Village. Nathan is on the Economy page. Please review current treasury balance, total economic activity (earned/spent/traded), which agents are generating the most value, and whether the Village is economically sustainable. Flag any Law 3 (Fair Share) concerns.`}
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Global Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-green-300/80">Total Earned</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalEarned} XRP</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-red-300/80">Total Spent</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalSpent} XRP</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-blue-300/80">Total Traded</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalTraded} XRP</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-purple-300/80">Treasury Count</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{treasuries.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="agents" className="data-[state=active]:bg-blue-500/20">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Agent Wealth
                        </TabsTrigger>
                        <TabsTrigger value="treasuries" className="data-[state=active]:bg-amber-500/20">
                            <Wallet className="w-4 h-4 mr-2" />
                            Treasuries
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {/* Real-time Economy Panel */}
                        <RealTimeEconomyPanel showAIHook={true} showDID={true} />
                    </TabsContent>

                    <TabsContent value="agents" className="space-y-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Agent Economic Rankings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {agents.map((agent, idx) => {
                                        const earnings = allActivities.filter(a => a.agent_id === agent.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
                                        const spending = allActivities.filter(a => a.agent_id === agent.id && a.activity_type === 'spent').reduce((sum, a) => sum + a.amount, 0);
                                        const net = earnings - spending;

                                        return (
                                            <div key={agent.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/20">
                                                            #{idx + 1}
                                                        </Badge>
                                                        <div>
                                                            <p className="text-white font-medium">{agent.name}</p>
                                                            <p className="text-xs text-white/60">{agent.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-lg font-medium ${net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                                            {net} XRP
                                                        </p>
                                                        <p className="text-xs text-white/40">{earnings} earned • {spending} spent</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="treasuries" className="space-y-6">
                        {treasuries.map(treasury => (
                            <TreasuryPanel 
                                key={treasury.id}
                                treasuryId={treasury.id}
                                canManage={user?.role === 'admin' || treasury.manager_agent_id === user?.id}
                            />
                        ))}
                        {treasuries.length === 0 && (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardContent className="py-12 text-center">
                                    <Wallet className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/40">No treasuries created yet</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}