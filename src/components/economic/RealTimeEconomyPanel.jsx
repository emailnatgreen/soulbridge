import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, Bot, User, TrendingUp, TrendingDown, Coins, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import moment from 'moment';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
};

export default function RealTimeEconomyPanel({ showAIHook = true, showDID = true }) {
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

  // Real-time data queries
  const { data: economicActivities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['realtime-economic-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 100),
    refetchInterval: 5000, // 5 second polling for real-time feel
  });

  const { data: treasuries = [], refetch: refetchTreasuries } = useQuery({
    queryKey: ['realtime-treasuries'],
    queryFn: () => base44.entities.Treasury.list(),
    refetchInterval: 10000, // 10 second polling
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-economy'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['realtime-transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 50),
    refetchInterval: 5000,
  });

  // Calculate real-time metrics (last 24 hours only, exclude simulated data)
  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + (t.total_balance || 0), 0);
  const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();
  const recentTransactions = transactions.filter(t => {
    const txDate = new Date(t.created_date);
    return t.status === 'completed' && 
           txDate >= twentyFourHoursAgo && 
           !t.description?.toLowerCase().includes('sim');
  });
  const totalVolume = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Agent wealth calculation
  const agentWealthMap = agents.reduce((acc, agent) => {
    const earnings = economicActivities
      .filter(a => a.agent_id === agent.id && ['earned', 'resource_sold', 'treasury_deposit'].includes(a.activity_type))
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const spending = economicActivities
      .filter(a => a.agent_id === agent.id && ['spent', 'resource_acquired', 'treasury_withdrawal'].includes(a.activity_type))
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    acc[agent.id] = {
      agent,
      earnings,
      spending,
      net: earnings - spending,
    };
    return acc;
  }, {});

  const topEarners = Object.values(agentWealthMap)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  // Real-time flow data (last 24 hours)
  const flowData = React.useMemo(() => {
    const hourlyData = {};
    const now = moment();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = now.clone().subtract(i, 'hours').format('HH:mm');
      hourlyData[hour] = { hour, inflow: 0, outflow: 0 };
    }

    economicActivities.forEach(activity => {
      const hour = moment(activity.created_date).format('HH:mm');
      if (hourlyData[hour]) {
        if (['earned', 'resource_sold', 'treasury_deposit'].includes(activity.activity_type)) {
          hourlyData[hour].inflow += activity.amount || 0;
        } else if (['spent', 'resource_acquired', 'treasury_withdrawal'].includes(activity.activity_type)) {
          hourlyData[hour].outflow += activity.amount || 0;
        }
      }
    });

    return Object.values(hourlyData);
  }, [economicActivities]);

  const recentActivities = economicActivities.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Identity & DID Header */}
      {showDID && (
        <Card className="bg-gradient-to-r from-purple-900/40 to-pink-900/30 border-purple-500/30">
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
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 text-xs">{myAgent.name}</span>
                    <span className="text-blue-400/50 text-[10px]">· {myAgent.role}</span>
                  </div>
                )}
              </div>

              {showAIHook && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAxi(`Review the real-time Village economy. Current treasury: ${totalTreasuryBalance.toFixed(2)} XRP. Total volume: ${totalVolume.toFixed(2)} XRP. ${topEarners.length > 0 ? `Top earner: ${topEarners[0].agent.name} with ${topEarners[0].earnings.toFixed(2)} XRP.` : ''} Assess economic health and flag any concerns.`)}
                  className="border-purple-400/40 text-purple-300 bg-purple-900/20 hover:bg-purple-500/20 text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Ask Axi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/60">Treasury Balance</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalTreasuryBalance.toFixed(2)} XRP</div>
            <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Live
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/60">24h Volume</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalVolume.toFixed(2)} XRP</div>
            <div className="text-xs text-blue-400 flex items-center gap-1 mt-1">
              {recentTransactions.length} txns
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/60">Active Agents</span>
            </div>
            <div className="text-2xl font-bold text-white">{agents.filter(a => a.status === 'active').length}</div>
            <div className="text-xs text-purple-400 flex items-center gap-1 mt-1">
              <Bot className="w-3 h-3" /> {agents.length} total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/60">Activities</span>
            </div>
            <div className="text-2xl font-bold text-white">{economicActivities.length}</div>
            <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
              Real-time sync
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Flow Chart */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-sm">24-Hour Economic Flow (Real-time)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={flowData}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
                formatter={(value) => [`${value.toFixed(2)} XRP`]}
              />
              <Area type="monotone" dataKey="inflow" stroke="#22c55e" fill="url(#inflowGrad)" strokeWidth={2} name="Inflow" />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="url(#outflowGrad)" strokeWidth={2} name="Outflow" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Earners */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Top Earners (Real-time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topEarners.map((earner, idx) => (
              <div key={earner.agent.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 w-6 h-6 flex items-center justify-center text-xs">
                    {idx + 1}
                  </Badge>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{earner.agent.name}</span>
                      {earner.agent.wallet_id && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[9px]">
                          <Shield className="w-2.5 h-2.5 inline mr-0.5" />DID
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-white/40 capitalize">{earner.agent.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{earner.earnings.toFixed(2)} XRP</div>
                  <div className="text-xs text-white/40">
                    Net: <span className={earner.net >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {earner.net >= 0 ? '+' : ''}{earner.net.toFixed(2)} XRP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Live Economic Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivities.map((activity) => {
              // Try multiple matching strategies for agent lookup
              const agent = agents.find(a => a.id === activity.agent_id) || 
                           agents.find(a => a.name === activity.agent_id) ||
                           agents.find(a => a.classic_address === activity.agent_id);
              const isInflow = ['earned', 'resource_sold', 'treasury_deposit'].includes(activity.activity_type);
              
              return (
                <div key={activity.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isInflow ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'
                  }`}>
                    {isInflow ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{agent?.name || 'Unknown'}</span>
                      {agent?.wallet_id && (
                        <Shield className="w-3 h-3 text-blue-400/60" />
                      )}
                    </div>
                    <div className="text-xs text-white/60 truncate">{activity.description}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${
                      isInflow ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {isInflow ? '+' : '-'}{activity.amount} XRP
                    </div>
                    <div className="text-xs text-white/40">
                      {moment(activity.created_date).fromNow()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}