import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ResourceDistribution({ resources, agents }) {
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  const rarityColors = {
    common: '#94a3b8',
    uncommon: '#3b82f6',
    rare: '#a855f7',
    epic: '#f59e0b',
    legendary: '#dc2626'
  };

  const typeColors = {
    knowledge: '#3b82f6',
    service: '#10b981',
    artifact: '#f59e0b',
    token: '#a855f7'
  };

  // Data for rarity pie chart
  const rarityData = resources.reduce((acc, r) => {
    const existing = acc.find(item => item.name === r.rarity);
    if (existing) {
      existing.value += 1;
      existing.totalValue += r.xrp_value * r.quantity;
    } else {
      acc.push({ name: r.rarity, value: 1, totalValue: r.xrp_value * r.quantity });
    }
    return acc;
  }, []);

  // Data for type distribution
  const typeData = resources.reduce((acc, r) => {
    const existing = acc.find(item => item.name === r.type);
    if (existing) {
      existing.value += r.quantity;
    } else {
      acc.push({ name: r.type, value: r.quantity });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rarity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rarity Distribution</CardTitle>
            <CardDescription>Resource rarity levels and values</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rarityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rarityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={rarityColors[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} items`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Type Distribution</CardTitle>
            <CardDescription>Resource quantity by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={typeColors[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} qty`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resource Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Inventory</CardTitle>
          <CardDescription>Complete list of available resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">{resource.name}</p>
                    <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{resource.description}</p>
                  <p className="text-xs text-slate-600 mt-1">Owner: {getAgentName(resource.owner_agent_id)}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{(resource.xrp_value * resource.quantity).toFixed(1)} XRP</div>
                  <div className="text-sm text-slate-600">qty: {resource.quantity}</div>
                  <Badge style={{ background: rarityColors[resource.rarity] }} className="text-xs mt-1">
                    {resource.rarity}
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