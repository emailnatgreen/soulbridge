import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShieldCheck, ShieldX, AlertTriangle, Wrench } from 'lucide-react';

export default function EmpathyTrendsPanel({ trends, loading }) {
  if (loading) return <div className="text-white/30 text-xs text-center py-6">Loading trends…</div>;
  if (!trends) return null;

  const { total_evaluated, total_allow, total_moderate, total_withhold, total_repair } = trends;

  const stats = [
    { label: 'Evaluated', value: total_evaluated, icon: Heart, color: 'text-pink-400' },
    { label: 'Allow', value: total_allow, icon: ShieldCheck, color: 'text-green-400' },
    { label: 'Moderate', value: total_moderate, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Withhold', value: total_withhold, icon: ShieldX, color: 'text-red-400' },
    { label: 'Repair', value: total_repair, icon: Wrench, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3 flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color} shrink-0`} />
            <div>
              <p className="text-[9px] text-white/30">{label}</p>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}