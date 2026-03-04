import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Activity, Wallet, TrendingUp, BarChart3, CheckCircle2, Clock,
  AlertCircle, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight,
  Shield, Target, Users, Zap, Globe, ChevronRight
} from 'lucide-react';
import RippleXRPLFeed from '@/components/ripple/RippleXRPLFeed';
import RippleProjectProgress from '@/components/ripple/RippleProjectProgress';
import RippleTreasuryPanel from '@/components/ripple/RippleTreasuryPanel';
import RippleTeamActivity from '@/components/ripple/RippleTeamActivity';

const RIPPLE_PROJECT_ID = '69a744fba111aa5302c44947';

// Key SoulBridge mainnet wallets to monitor
const MONITORED_WALLETS = [
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', name: 'Human Node' },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', name: 'Code Node' },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', name: 'Truth Node' },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', name: 'Lore Node' },
  { address: 'rKbJxBgrc1fVgyVb5zU76tuZXJ4nT5XTsG', name: 'Treasury' },
];

export default function RippleDashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live XRPL balances
  const { data: wallets = [], refetch: refetchWallets } = useQuery({
    queryKey: ['ripple_wallets'],
    queryFn: () => base44.entities.Wallet.filter({ network: 'mainnet' }),
    refetchInterval: 30000,
  });

  // Project data
  const { data: project, refetch: refetchProject } = useQuery({
    queryKey: ['ripple_project'],
    queryFn: () => base44.entities.AIProject.filter({ id: RIPPLE_PROJECT_ID }),
    select: (data) => data[0],
    refetchInterval: 60000,
  });

  // Tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['ripple_tasks'],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: RIPPLE_PROJECT_ID }),
    refetchInterval: 60000,
  });

  // Treasury
  const { data: treasuries = [], refetch: refetchTreasury } = useQuery({
    queryKey: ['ripple_treasury'],
    queryFn: () => base44.entities.Treasury.list(),
    refetchInterval: 30000,
  });

  // Economic Activity
  const { data: economicActivity = [], refetch: refetchEconomy } = useQuery({
    queryKey: ['ripple_economy'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 20),
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchWallets(), refetchProject(), refetchTasks(), refetchTreasury(), refetchEconomy()]);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Computed stats
  const totalXRP = wallets
    .filter(w => w.network === 'mainnet')
    .reduce((sum, w) => sum + (w.balance || 0), 0);

  const mainTreasury = treasuries.find(t => t.name === 'SoulBridge Main Treasury') || treasuries[0];
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEarned = economicActivity
    .filter(e => e.activity_type === 'earned')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Header */}
      <div className="border-b border-blue-200 bg-white/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="sm" className="text-gray-500">← Home</Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">Ripple Accelerator Dashboard</h1>
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1 animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-11">SoulBridge × Ripple Grant — Real-time Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* KPI Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-blue-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total XRP (On-Chain)</p>
                  <p className="text-2xl font-bold text-gray-900">{totalXRP.toFixed(2)}</p>
                  <p className="text-xs text-blue-600 mt-1">XRP · Mainnet</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Treasury Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{(mainTreasury?.total_balance || 0).toFixed(2)}</p>
                  <p className="text-xs text-green-600 mt-1">XRP · {mainTreasury?.name || 'Treasury'}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-purple-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Project Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{taskProgress}%</p>
                  <p className="text-xs text-purple-600 mt-1">{completedTasks}/{totalTasks} tasks done</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <Progress value={taskProgress} className="mt-3 h-1.5" />
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEarned.toFixed(0)}</p>
                  <p className="text-xs text-amber-600 mt-1">XRP · Village Activity</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="xrpl" className="space-y-6">
          <TabsList className="bg-white border border-blue-200 p-1 rounded-xl">
            <TabsTrigger value="xrpl" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Globe className="w-4 h-4 mr-2" />
              XRPL Live Feed
            </TabsTrigger>
            <TabsTrigger value="project" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Target className="w-4 h-4 mr-2" />
              Grant Progress
            </TabsTrigger>
            <TabsTrigger value="treasury" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Shield className="w-4 h-4 mr-2" />
              Treasury
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Team Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xrpl">
            <RippleXRPLFeed wallets={wallets.filter(w => w.network === 'mainnet')} monitoredWallets={MONITORED_WALLETS} />
          </TabsContent>

          <TabsContent value="project">
            <RippleProjectProgress project={project} tasks={tasks} />
          </TabsContent>

          <TabsContent value="treasury">
            <RippleTreasuryPanel treasuries={treasuries} economicActivity={economicActivity} />
          </TabsContent>

          <TabsContent value="team">
            <RippleTeamActivity tasks={tasks} economicActivity={economicActivity} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}