import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Coins, Package, Zap } from 'lucide-react';
import TransactionFlow from '../components/economic/TransactionFlow';
import ResourceDistribution from '../components/economic/ResourceDistribution';
import AgentEconomicMetrics from '../components/economic/AgentEconomicMetrics';
import EconomicTimeline from '../components/economic/EconomicTimeline';

export default function EconomicDashboard() {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
  });

  const { data: economicActivities = [] } = useQuery({
    queryKey: ['economicActivities'],
    queryFn: () => base44.entities.EconomicActivity.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  // Calculate statistics
  const totalTransactionVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const completedTransactions = transactions.filter(t => t.status === 'completed').length;
  const totalResourceValue = resources.reduce((sum, r) => sum + (r.xrp_value * r.quantity), 0);
  const totalEarned = economicActivities
    .filter(a => a.activity_type === 'earned')
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Economic Dashboard</h1>
          <p className="text-slate-600">Agent ecosystem economic activity, resource distribution, and performance metrics</p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Transaction Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Coins className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalTransactionVolume.toFixed(1)} XRP</p>
                  <p className="text-xs text-slate-500">{completedTransactions} completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Resource Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{resources.length} Items</p>
                  <p className="text-xs text-slate-500">{totalResourceValue.toFixed(1)} XRP total value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalEarned.toFixed(1)} XRP</p>
                  <p className="text-xs text-slate-500">From services</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
                  <p className="text-xs text-slate-500">In ecosystem</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="agents">Agent Metrics</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionFlow transactions={transactions} agents={agents} />
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <ResourceDistribution resources={resources} agents={agents} />
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <AgentEconomicMetrics economicActivities={economicActivities} agents={agents} />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <EconomicTimeline economicActivities={economicActivities} agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}