import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Scale, RefreshCw, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ASSETS = [
  { id: 'xrp', label: 'XRP/USD', color: '#3b82f6', defaultTarget: 40 },
  { id: 'doge', label: 'DOGE/USDT', color: '#f59e0b', defaultTarget: 20 },
  { id: 'vet', label: 'VET/USDT', color: '#10b981', defaultTarget: 15 },
  { id: 'gbpusd', label: 'GBP/USD', color: '#8b5cf6', defaultTarget: 10 },
  { id: 'eurusd', label: 'EUR/USD', color: '#6366f1', defaultTarget: 10 },
  { id: 'xauusd', label: 'XAU/USD', color: '#d97706', defaultTarget: 5 },
];

export default function PortfolioRebalancer({ multiPrices, xrpPrice }) {
  const [targets, setTargets] = useState(
    Object.fromEntries(ASSETS.map(a => [a.id, a.defaultTarget]))
  );
  const [rebalanced, setRebalanced] = useState(false);

  const total = Object.values(targets).reduce((s, v) => s + v, 0);

  const handleSlider = (id, val) => {
    setTargets(prev => ({ ...prev, [id]: val[0] }));
    setRebalanced(false);
  };

  const handleAutoBalance = () => {
    const each = Math.floor(100 / ASSETS.length);
    const rem = 100 - each * ASSETS.length;
    const balanced = Object.fromEntries(ASSETS.map((a, i) => [a.id, each + (i === 0 ? rem : 0)]));
    setTargets(balanced);
    setRebalanced(true);
  };

  const pieData = ASSETS.map(a => ({ name: a.label, value: targets[a.id], color: a.color }));

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-400" />
              Portfolio Rebalancer
              <Badge className="bg-amber-800/40 text-amber-300 border-amber-700/50 text-xs">Simulation Mode</Badge>
            </CardTitle>
            <button
              onClick={handleAutoBalance}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-800/40 hover:bg-indigo-700/50 border border-indigo-700/50 text-indigo-300 text-xs rounded-lg transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Auto-Balance
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rebalanced && (
            <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/40 rounded-lg text-green-300 text-sm">
              <Scale className="h-4 w-4" />
              Portfolio auto-balanced to equal allocation.
            </div>
          )}
          {total !== 100 && (
            <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-300 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Allocations total <strong>{total}%</strong> — must equal 100% to rebalance.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sliders */}
            <div className="space-y-4">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Target Allocations</div>
              {ASSETS.map(asset => {
                const price = asset.id === 'xrp' ? xrpPrice : multiPrices?.[asset.id];
                return (
                  <div key={asset.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: asset.color }} className="font-medium">{asset.label}</span>
                      <div className="flex items-center gap-2">
                        {price && <span className="text-gray-500 text-xs">${price < 0.01 ? price.toFixed(6) : price > 1000 ? price.toFixed(0) : price.toFixed(4)}</span>}
                        <span className="text-white font-bold w-10 text-right">{targets[asset.id]}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[targets[asset.id]]}
                      onValueChange={val => handleSlider(asset.id, val)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                );
              })}
              <div className={`text-xs font-semibold pt-1 ${total === 100 ? 'text-green-400' : 'text-amber-400'}`}>
                Total: {total}% {total === 100 ? '✓' : `(${total > 100 ? '+' : ''}${total - 100}% off)`}
              </div>
            </div>

            {/* Pie Chart */}
            <div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Allocation Breakdown</div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'Target']}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rebalance Action */}
          <div className="pt-2 border-t border-gray-700/50">
            <button
              disabled={total !== 100}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                total === 100
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              onClick={() => setRebalanced(true)}
            >
              {total === 100 ? 'Apply Rebalance (Simulation)' : `Adjust allocations to 100% first`}
            </button>
            <p className="text-xs text-gray-600 text-center mt-2">Simulation only — no real trades executed until CR-01/2026 approval</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}