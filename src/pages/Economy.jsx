import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, TrendingUp, Wallet, Package, BarChart3, Shield, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import TreasuryPanel from '../components/TreasuryPanel';
import AskAxiButton from '@/components/AskAxiButton';
import RealTimeEconomyPanel from '@/components/economic/RealTimeEconomyPanel';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
};

export default function EconomyPage() {
    const [identity, setIdentity] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [myAgent, setMyAgent] = useState(null);

    // Load identity and user
    useEffect(() => {
        try {
            const stored = localStorage.getItem('soulbridge_identity');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.connected) setIdentity(parsed);
            }
        } catch (e) {}

        base44.auth.me().then(async (u) => {
            if (!u) return;
            setCurrentUser(u);
            const agents = await base44.entities.Agent.list();
            const mine = agents.find(a => a.created_by === u.email);
            if (mine) setMyAgent(mine);
        }).catch(() => {});
    }, []);

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list('-honor_score', 100),
    });

    const { data: treasuries = [] } = useQuery({
        queryKey: ['treasuries'],
        queryFn: () => base44.entities.Treasury.list(),
    });

    const { data: wallets = [] } = useQuery({
        queryKey: ['wallets'],
        queryFn: () => base44.entities.Wallet.list(),
    });

    const { data: allActivities = [] } = useQuery({
        queryKey: ['all-economic-activities'],
        queryFn: () => base44.entities.EconomicActivity.list('-created_date', 1000),
        refetchInterval: 10000,
    });

    // Filter to only show recent real activities (last 7 days, exclude simulated/test data)
    const recentActivities = allActivities.filter(activity => {
        const activityDate = new Date(activity.created_date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return activityDate >= sevenDaysAgo && !activity.description?.toLowerCase().includes('sim');
    });

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me(),
    });

    // Check if user is Nathan Green with admin role
    const isNathanAdmin = user?.email === 'emailnatgreen@gmail.com' && user?.role === 'admin';

    const totalEarned = recentActivities.filter(a => a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
    const totalSpent = recentActivities.filter(a => a.activity_type === 'spent').reduce((sum, a) => sum + a.amount, 0);
    const totalTraded = recentActivities.filter(a => a.activity_type === 'traded').reduce((sum, a) => sum + a.amount, 0);

    const agentWithMostWealth = agents.length > 0 ? agents.reduce((prev, current) => {
        const currentEarnings = recentActivities.filter(a => a.agent_id === current.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
        const prevEarnings = recentActivities.filter(a => a.agent_id === prev.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
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
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-green-300/80">Total Earned</CardTitle>
                                <Badge className="text-[9px] bg-white/10">Last 7 days</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalEarned.toFixed(2)} XRP</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-red-300/80">Total Spent</CardTitle>
                                <Badge className="text-[9px] bg-white/10">Last 7 days</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalSpent.toFixed(2)} XRP</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-blue-300/80">Total Traded</CardTitle>
                                <Badge className="text-[9px] bg-white/10">Last 7 days</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-light text-white">{totalTraded.toFixed(2)} XRP</p>
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
                        {isNathanAdmin && (
                            <TabsTrigger value="treasuries" className="data-[state=active]:bg-amber-500/20">
                                <Wallet className="w-4 h-4 mr-2" />
                                Treasuries
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {/* Real-time Economy Panel */}
                        <RealTimeEconomyPanel showAIHook={true} showDID={true} />
                    </TabsContent>

                    <TabsContent value="agents" className="space-y-6">
                        {/* DID & AI Header for Agent Wealth */}
                        <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/30 border-blue-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        {identity?.connected ? (
                                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                                                <Shield className="w-4 h-4 text-green-400" />
                                                <span className="text-green-300 text-xs font-mono">{identity.did?.slice(0, 16)}…</span>
                                                <Badge className="bg-green-500/20 text-green-300 text-[10px]">Verified</Badge>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                                <span className="text-yellow-300 text-xs">DID Not Connected</span>
                                            </div>
                                        )}
                                        
                                        {myAgent && (
                                            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5">
                                                <Shield className="w-4 h-4 text-blue-400" />
                                                <span className="text-blue-300 text-xs">{myAgent.name}</span>
                                                <span className="text-blue-400/50 text-[10px]">· {myAgent.role}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openAxi(`Analyze Agent Wealth rankings. Total agents: ${agents.length}. Top earner: ${agentWithMostWealth?.name || 'N/A'} with ${agentWithMostWealth ? allActivities.filter(a => a.agent_id === agentWithMostWealth.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0).toFixed(2) : 0} XRP. Assess wealth distribution, identify any concentration risks, and check for Law 3 (Fair Share) compliance.`)}
                                        className="border-blue-400/40 text-blue-300 bg-blue-900/20 hover:bg-blue-500/20 text-xs gap-1.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> AI Wealth Analysis
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    Agent Wealth Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {agents.map((agent, idx) => {
                                        const agentWallet = wallets.find(w => w.id === agent.wallet_id);
                                        const earnings = allActivities.filter(a => a.agent_id === agent.id && a.activity_type === 'earned').reduce((sum, a) => sum + a.amount, 0);
                                        const spending = allActivities.filter(a => a.agent_id === agent.id && a.activity_type === 'spent').reduce((sum, a) => sum + a.amount, 0);
                                        const net = earnings - spending;
                                        const walletBalance = agentWallet?.balance || 0;

                                        return (
                                            <div key={agent.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/20">
                                                            #{idx + 1}
                                                        </Badge>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-white font-medium">{agent.name}</p>
                                                                {agent.wallet_id && (
                                                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[9px]">
                                                                        <Shield className="w-2.5 h-2.5 inline mr-0.5" />DID Published
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-white/60">{agent.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-medium text-white">{walletBalance.toFixed(2)} XRP</p>
                                                        <p className="text-xs text-white/40">Balance</p>
                                                        <p className="text-xs text-white/50 mt-1">{earnings.toFixed(2)} earned • {spending.toFixed(2)} spent</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {isNathanAdmin && (
                        <TabsContent value="treasuries" className="space-y-6">
                            {/* DID & AI Header for Treasuries */}
                            <Card className="bg-gradient-to-r from-amber-900/40 to-orange-900/30 border-amber-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            {identity?.connected ? (
                                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                                                    <Shield className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-300 text-xs font-mono">{identity.did?.slice(0, 16)}…</span>
                                                    <Badge className="bg-green-500/20 text-green-300 text-[10px]">Verified</Badge>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                                                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                                                    <span className="text-yellow-300 text-xs">DID Not Connected</span>
                                                </div>
                                            )}
                                            
                                            {myAgent && (
                                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                                                    <Wallet className="w-4 h-4 text-amber-400" />
                                                    <span className="text-amber-300 text-xs">{myAgent.name}</span>
                                                    <span className="text-amber-400/50 text-[10px]">· Treasury Monitor</span>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openAxi(`Review Treasury health. Total treasuries: ${treasuries.length}. Combined balance: ${treasuries.reduce((sum, t) => sum + (t.total_balance || 0), 0).toFixed(2)} XRP. Check if balances are sufficient for committed obligations, assess sustainability, and flag any concerns.`)}
                                            className="border-amber-400/40 text-amber-300 bg-amber-900/20 hover:bg-amber-500/20 text-xs gap-1.5"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> AI Treasury Review
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

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
                    )}
                </Tabs>
            </div>
        </div>
    );
}