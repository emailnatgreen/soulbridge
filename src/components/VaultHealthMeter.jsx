import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Shield } from 'lucide-react';

export default function VaultHealthMeter({ vault, agent }) {
  const healthPercent = vault?.vault_health_percent || 100;
  const honorScore = agent?.honor_score || 100;
  const borrowedAmount = vault?.borrowed_rlusd || 0;
  const collateralValue = vault?.collateral_value_xrp || 0;
  
  // Health status determination
  const getHealthStatus = (health) => {
    if (health >= 80) return { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-50' };
    if (health >= 70) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (health >= 50) return { label: 'Warning', color: 'text-yellow-500', bg: 'bg-yellow-50' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-50' };
  };

  const status = getHealthStatus(healthPercent);
  const ltv = collateralValue > 0 ? (borrowedAmount / collateralValue * 100).toFixed(1) : 0;

  return (
    <Card className={`${status.bg} border-l-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Vault Health</CardTitle>
          <Badge className={`${status.color} bg-white border`}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Meter Visual */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Honour-to-Debt Ratio</span>
            <span className="font-semibold">{healthPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                healthPercent >= 80 ? 'bg-green-500' :
                healthPercent >= 70 ? 'bg-blue-500' :
                healthPercent >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, healthPercent)}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-white rounded p-2">
            <p className="text-gray-500 text-xs mb-1">Honour Score</p>
            <p className="font-bold text-lg">{honorScore}</p>
          </div>
          <div className="bg-white rounded p-2">
            <p className="text-gray-500 text-xs mb-1">LTV Ratio</p>
            <p className="font-bold text-lg">{ltv}%</p>
          </div>
          <div className="bg-white rounded p-2">
            <p className="text-gray-500 text-xs mb-1">Interest Rate</p>
            <p className="font-bold text-lg">{vault?.interest_rate_percent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Alert if warning */}
        {healthPercent < 70 && (
          <div className={`flex gap-2 items-start p-3 rounded ${status.bg} border border-current`}>
            <AlertCircle className={`w-4 h-4 ${status.color} mt-0.5 shrink-0`} />
            <p className="text-sm text-gray-700">
              {healthPercent < 50
                ? 'Critical: Liquidation risk. Make a payment to restore health.'
                : 'Action needed: Repay to maintain vault stability.'}
            </p>
          </div>
        )}

        {/* Positive status */}
        {healthPercent >= 80 && (
          <div className="flex gap-2 items-start p-3 rounded bg-green-50 border border-green-300">
            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-700">
              Your vault is in excellent standing. Your Self-NFT is luminous and yielding.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}