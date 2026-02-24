import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AgentEconomicMetrics({ economicActivities, agents }) {
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  // Calculate per-agent metrics
  const agentMetrics = economicActivities.reduce((acc, activity) => {
    const existing = acc.find(item => item.agentId === activity.agent_id);
    
    if (existing) {
      if (activity.activity_type === 'earned') {
        existing.earned += activity.amount;
      } else if (activity.activity_type === 'spent') {
        existing.spent += activity.amount;
      }
    } else {
      const earned = activity.activity_type === 'earned' ? activity.amount : 0;
      const spent = activity.activity_type === 'spent' ? activity.amount : 0;
      acc.push({
        agentId: activity.agent_id,
        agentName: getAgentName(activity.agent_id),
        earned,
        spent,
        transactionCount: 1
      });
    }
    return acc;
  }, []);

  // Add balance and count
  const metricsWithBalance = agentMetrics.map(m => ({
    ...m,
    balance: m.earned - m.spent,
    transactionCount: economicActivities.filter(a => a.agent_id === m.agentId).length
  })).sort((a, b) => b.balance - a.balance);

  const chartData = metricsWithBalance.map(m => ({
    name: m.agentName,
    Earned: m.earned,
    Spent: m.spent
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Economic Performance</CardTitle>
          <CardDescription>Earned vs. spent per agent</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Earned" stackId="a" fill="#10b981" />
              <Bar dataKey="Spent" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Agent Metrics</CardTitle>
          <CardDescription>Economic performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metricsWithBalance.map((metric) => (
              <div key={metric.agentId} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{metric.agentName}</p>
                  <p className="text-sm text-slate-600">{metric.transactionCount} transactions</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="text-sm">
                      <p className="text-green-600 font-semibold">+{metric.earned.toFixed(1)} XRP</p>
                      <p className="text-red-600 text-xs">-{metric.spent.toFixed(1)} XRP</p>
                    </div>
                  </div>
                  <Badge variant={metric.balance >= 0 ? "default" : "destructive"}>
                    {metric.balance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {metric.balance.toFixed(1)} XRP
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}