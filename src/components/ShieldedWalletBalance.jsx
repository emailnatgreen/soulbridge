import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ShieldedWalletBalance({ autoRefresh = true, refreshInterval = 30000 }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('checkShieldedBalance', {});
      setBalance(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch shielded balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    if (autoRefresh) {
      const interval = setInterval(fetchBalance, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          Shielded Wallet (Ethereum)
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchBalance}
          disabled={loading}
          className="h-8 w-8 text-white/60 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !balance ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : balance ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-white/50">RLUSD Balance</p>
                {parseFloat(balance.balance) > 0 && (
                  <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                    ✓ Verified Assets
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-light text-white">
                {parseFloat(balance.balance).toFixed(2)}
                <span className="text-lg text-white/60 ml-2">RLUSD</span>
              </p>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-xs text-white/50 mb-1">Ethereum Address</p>
              <p className="text-xs font-mono text-white/80 break-all bg-white/5 px-2 py-1 rounded">
                {balance.address}
              </p>
            </div>

            {autoRefresh && lastUpdate && (
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                  Auto-refresh: {refreshInterval / 1000}s
                </Badge>
                <p className="text-xs text-white/40">
                  Updated: {formatTime(lastUpdate)}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-white/60 text-sm">Unable to load balance</p>
        )}
      </CardContent>
    </Card>
  );
}