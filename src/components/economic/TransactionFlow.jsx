import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';

export default function TransactionFlow({ transactions, agents }) {
  const getAgentName = (address) => {
    // Try to find agent by wallet address
    const agent = agents.find(a => a.classic_address === address);
    return agent?.name || address.substring(0, 10) + '...';
  };

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-800', icon: null }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Flow</CardTitle>
        <CardDescription>Recent XRP transactions between agents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-sm">No transactions yet</p>
          ) : (
            transactions.map((tx) => {
              const config = statusConfig[tx.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{getAgentName(tx.recipient_address)}</p>
                      {tx.note && <p className="text-xs text-slate-500">{tx.note}</p>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{tx.amount} XRP</p>
                    </div>
                  </div>
                  <Badge className={`${config.color} ml-4`}>
                    {tx.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {tx.status}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}