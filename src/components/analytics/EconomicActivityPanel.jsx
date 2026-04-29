import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import moment from 'moment';

export default function EconomicActivityPanel({ transactions, agentId }) {
  const bought = transactions?.bought || [];
  const sold = transactions?.sold || [];
  const all = [...bought.map(t => ({ ...t, direction: 'bought' })), ...sold.map(t => ({ ...t, direction: 'sold' }))]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalSpent = bought.reduce((s, t) => s + (t.unit_amount || t.purchase_price_rlusd || 0), 0);
  const totalEarned = sold.reduce((s, t) => s + (t.unit_amount || t.purchase_price_rlusd || 0), 0);

  if (all.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <ShoppingBag className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No economic activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Total Earned</p>
            <p className="text-xl font-bold text-green-400">{totalEarned.toFixed(2)}</p>
            <p className="text-white/20 text-xs">RLUSD</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Total Spent</p>
            <p className="text-xl font-bold text-red-400">{totalSpent.toFixed(2)}</p>
            <p className="text-white/20 text-xs">RLUSD</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 col-span-2 lg:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Net</p>
            <p className={`text-xl font-bold ${totalEarned - totalSpent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(totalEarned - totalSpent).toFixed(2)}
            </p>
            <p className="text-white/20 text-xs">RLUSD</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {all.map(tx => {
              const isBuy = tx.direction === 'bought';
              return (
                <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isBuy ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                    {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">{tx.resource_name || tx.marketplace_type || 'Transaction'}</p>
                    <p className="text-white/30 text-xs">{isBuy ? 'Purchased' : 'Sold'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-medium ${isBuy ? 'text-red-400' : 'text-green-400'}`}>
                      {isBuy ? '-' : '+'}{tx.unit_amount || tx.purchase_price_rlusd || 0}
                    </p>
                    <Badge className="bg-white/5 text-white/30 text-[10px]">{tx.status}</Badge>
                    <p className="text-white/20 text-[10px] mt-0.5">{moment(tx.created_date).fromNow()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}