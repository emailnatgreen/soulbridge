import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, AlertCircle, Settings, Activity, PieChart, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import IntegrationUsageBreakdown from '@/components/IntegrationUsageBreakdown';
import IntegrationSettingsPanel from '@/components/IntegrationSettingsPanel';
import IntegrationAlerts from '@/components/IntegrationAlerts';
import IntegrationUsageTimeline from '@/components/IntegrationUsageTimeline';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#84cc16'];

export default function IntegrationCreditDashboard() {
  const [timeRange, setTimeRange] = useState('month'); // week, month, all
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch settings
  const { data: settings = {} } = useQuery({
    queryKey: ['integration-credit-settings'],
    queryFn: async () => {
      const result = await base44.entities.IntegrationCreditSettings.list();
      return result[0] || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch usage logs
  const { data: usageLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['integration-usage-logs', timeRange],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filter = timeRange === 'month' 
        ? { created_date: { $gte: thirtyDaysAgo.toISOString() } }
        : timeRange === 'week'
        ? { created_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } }
        : {};
      return await base44.entities.IntegrationUsageLog.filter(filter, '-created_date', 1000);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Calculate KPIs
  const totalCreditsUsed = usageLogs.reduce((sum, log) => sum + (log.credits_consumed || 0), 0);
  const budgetRemaining = (settings.monthly_budget_credits || 1000) - totalCreditsUsed;
  const usagePercent = Math.round((totalCreditsUsed / (settings.monthly_budget_credits || 1000)) * 100);
  const avgCreditsPerCall = usageLogs.length > 0 ? (totalCreditsUsed / usageLogs.length).toFixed(2) : 0;

  // Breakdown by integration type
  const integrationBreakdown = usageLogs.reduce((acc, log) => {
    const existing = acc.find(item => item.type === log.integration_type);
    if (existing) {
      existing.credits += log.credits_consumed;
      existing.count += 1;
    } else {
      acc.push({ type: log.integration_type, credits: log.credits_consumed, count: 1 });
    }
    return acc;
  }, []);

  // Service breakdown
  const serviceBreakdown = usageLogs.reduce((acc, log) => {
    const existing = acc.find(item => item.name === log.service_name);
    if (existing) {
      existing.credits += log.credits_consumed;
    } else {
      acc.push({ name: log.service_name || 'Unknown', credits: log.credits_consumed });
    }
    return acc;
  }, []).sort((a, b) => b.credits - a.credits).slice(0, 10);

  // Daily usage trend
  const dailyUsage = usageLogs.reduce((acc, log) => {
    const date = new Date(log.created_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.credits += log.credits_consumed;
      existing.calls += 1;
    } else {
      acc.push({ date, credits: log.credits_consumed, calls: 1 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

  const statusColor = usagePercent >= settings.critical_threshold_percent ? 'text-red-400' 
    : usagePercent >= settings.alert_threshold_percent ? 'text-yellow-400' 
    : 'text-green-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h1 className="text-3xl font-light text-white">Integration Credit Management</h1>
            </div>
            <Button onClick={() => setShowSettings(!showSettings)} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Settings className="w-4 h-4" /> Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8">
            <IntegrationSettingsPanel settings={settings} onSettingsUpdated={() => refetchLogs()} />
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-white/50 text-sm mb-2">Monthly Budget</div>
              <div className="text-3xl font-bold text-white">{settings.monthly_budget_credits || 1000}</div>
              <div className="text-xs text-white/40 mt-2">credits allocated</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-white/50 text-sm mb-2">Used This Month</div>
              <div className={`text-3xl font-bold ${statusColor}`}>{totalCreditsUsed}</div>
              <div className="text-xs text-white/40 mt-2">{usagePercent}% of budget</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-white/50 text-sm mb-2">Remaining</div>
              <div className={`text-3xl font-bold ${budgetRemaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {Math.max(0, budgetRemaining)}
              </div>
              <div className="text-xs text-white/40 mt-2">credits left</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-white/50 text-sm mb-2">Avg Cost per Call</div>
              <div className="text-3xl font-bold text-blue-400">{avgCreditsPerCall}</div>
              <div className="text-xs text-white/40 mt-2">credits/operation</div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <IntegrationAlerts settings={settings} usagePercent={usagePercent} usageLogs={usageLogs} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Usage Timeline */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" /> Daily Usage Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Line type="monotone" dataKey="credits" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-white/40">No usage data for this period</div>
              )}
            </CardContent>
          </Card>

          {/* Integration Type Breakdown */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-pink-400" /> By Integration Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {integrationBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie data={integrationBreakdown} dataKey="credits" label={({ type, credits }) => `${type}: ${credits}`} isAnimationActive={false}>
                      {integrationBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-white/40">No usage data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown & Usage Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Services */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceBreakdown.length > 0 ? (
                  serviceBreakdown.map((service, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-3 border-b border-white/10 last:border-0">
                      <span className="text-white/80 text-sm">{service.name}</span>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{service.credits} credits</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 text-sm">No service data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Integration Type Details */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Integration Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrationBreakdown.length > 0 ? (
                  integrationBreakdown.map((item, idx) => (
                    <div key={idx} className="pb-3 border-b border-white/10 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/80 text-sm capitalize">{item.type.replace(/_/g, ' ')}</span>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{item.count} calls</Badge>
                      </div>
                      <div className="text-2xl font-bold text-white">{item.credits}</div>
                      <div className="text-xs text-white/40">{(item.credits / item.count).toFixed(2)} avg/call</div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 text-sm">No integration data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" /> Recent Usage Activity
              </span>
              <div className="flex gap-2">
                {['week', 'month'].map(range => (
                  <Button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IntegrationUsageBreakdown logs={usageLogs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}