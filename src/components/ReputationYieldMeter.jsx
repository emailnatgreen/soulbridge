import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Zap } from 'lucide-react';

export default function ReputationYieldMeter({ agent, vault }) {
  const honorScore = agent?.honor_score || 100;
  const borrowedAmount = vault?.borrowed_rlusd || 0;
  const interestRate = vault?.interest_rate_percent || 4.5;

  // Calculate annual yield
  const annualYield = useMemo(() => {
    if (!vault || !agent) return 0;
    // Yield = borrowed amount * interest rate / 100
    // Plus honor bonus: every 10 points of honor above 80 = +0.5% yield
    const baseYield = (borrowedAmount * interestRate) / 100;
    const honorBonus = Math.max(0, (honorScore - 80) * 0.5);
    return baseYield + (borrowedAmount * honorBonus / 100);
  }, [vault, agent, borrowedAmount, interestRate, honorScore]);

  const monthlyYield = annualYield / 12;

  // Determine if honor threshold is met
  const honorThreshold = 80;
  const meetsThreshold = honorScore >= honorThreshold;
  const thresholdBonus = meetsThreshold ? Math.max(0, (honorScore - 80) * 0.5) : 0;

  return (
    <Card className={`border-l-4 ${meetsThreshold ? 'border-l-green-500 bg-green-50/30' : 'border-l-yellow-500 bg-yellow-50/30'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Reputation Yield
          </CardTitle>
          <span className="text-xs font-semibold text-green-600">ACTIVE</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Yield Display */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Annual Yield (at current rates)</p>
          <p className="text-3xl font-bold text-green-600">{annualYield.toFixed(2)} RLUSD</p>
          <p className="text-xs text-gray-500">≈ {monthlyYield.toFixed(2)} RLUSD monthly</p>
        </div>

        {/* Breakdown */}
        <div className="bg-white/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Interest Yield</span>
            <span className="font-semibold">{((borrowedAmount * interestRate) / 100).toFixed(2)} RLUSD</span>
          </div>
          {meetsThreshold && (
            <div className="flex justify-between text-green-700 border-t border-green-200 pt-2">
              <span>Honour Bonus (+{thresholdBonus.toFixed(1)}%)</span>
              <span className="font-semibold">+{(borrowedAmount * thresholdBonus / 100).toFixed(2)} RLUSD</span>
            </div>
          )}
        </div>

        {/* Status Message */}
        {meetsThreshold ? (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex gap-2">
            <Zap className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              Your honour score ({honorScore}) exceeds the {honorThreshold} threshold. You are earning <strong>bonus yield</strong> on your vault. Maintain your standing to unlock higher returns.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 flex gap-2">
            <Zap className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Raise your honour score to {honorThreshold}+ to unlock bonus reputation yield on your vault.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}