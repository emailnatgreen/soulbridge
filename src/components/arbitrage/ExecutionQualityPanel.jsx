import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, DollarSign, Droplets } from 'lucide-react';

const METRICS = [
  { icon: Zap, label: 'Avg Slippage', value: null, target: '< 0.1%', color: 'text-yellow-400', unit: '%' },
  { icon: DollarSign, label: 'Avg Fee / Trade', value: null, target: '< 0.2%', color: 'text-green-400', unit: '%' },
  { icon: Clock, label: 'Avg Execution Latency', value: null, target: '< 500ms', color: 'text-blue-400', unit: 'ms' },
  { icon: Droplets, label: 'Liquidity Score', value: null, target: '≥ 80/100', color: 'text-indigo-400', unit: '/100' },
];

export default function ExecutionQualityPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
        <Zap className="h-5 w-5 text-yellow-400 flex-shrink-0" />
        <div>
          <div className="text-yellow-300 font-medium text-sm">CR-01/2026 — Execution Quality Standards</div>
          <div className="text-gray-400 text-xs">Slippage, fees, latency, and liquidity metrics require live execution data from the trading backend.</div>
        </div>
        <Badge className="ml-auto bg-amber-800/40 text-amber-300 border-amber-700/50 text-xs shrink-0">Pending Data</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <Card key={i} className="bg-gray-900/60 border-gray-700/50">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${m.color}`} />
                  <span className="text-gray-400 text-xs">{m.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-500">—</div>
                <div className="text-xs text-gray-600 mt-1">Target: {m.target}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Standards reference */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm">CR-01/2026 — Required Execution Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { standard: 'Slippage', requirement: 'Average slippage < 0.1% per trade', note: 'Measured at entry and exit' },
              { standard: 'Fees', requirement: 'Total fees < 0.2% per round-trip', note: 'Includes DEX, gas, spread costs' },
              { standard: 'Latency', requirement: 'Execution latency < 500ms', note: 'Signal-to-order submission time' },
              { standard: 'Liquidity', requirement: 'Trades execute at ≥ 95% of target size', note: 'No partial fills > 5%' },
            ].map((row, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{row.standard}</div>
                  <div className="text-gray-400 text-xs">{row.requirement}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{row.note}</div>
                </div>
                <Badge className="bg-gray-700/40 text-gray-400 border-gray-600/50 text-xs ml-3">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}