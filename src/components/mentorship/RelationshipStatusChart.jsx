import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
  active: '#34d399',
  requested: '#facc15',
  completed: '#60a5fa',
  paused: '#f97316',
  cancelled: '#94a3b8',
  declined: '#f87171'
};

export default function RelationshipStatusChart({ relationships }) {
  const counts = {};
  relationships.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });

  const data = Object.entries(counts).map(([status, value]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value,
    color: STATUS_COLORS[status] || '#94a3b8'
  }));

  if (data.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm">Relationship Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend
              formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}