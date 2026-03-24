import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Clock, TrendingUp, Loader2 } from 'lucide-react';
import moment from 'moment';

export default function WalletTransactionHistory({ walletId, walletAddress }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['wallet-transactions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      try {
        const response = await base44.functions.invoke('getWalletTransactions', {
          wallet_address: walletAddress,
          limit: 50
        });
        return response.data?.transactions || [];
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!walletAddress,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const validTransactions = transactions.filter(tx => {
    const isValidAmount = typeof tx.Amount === 'number' && !isNaN(tx.Amount) && tx.Amount >= 0;
    return isValidAmount && (tx.Account || tx.Destination);
  });

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {validTransactions.map((tx, idx) => {
              const isOutgoing = tx.Account === walletAddress;
              const amount = tx.Amount || 0;
              const recipient = tx.Destination || 'Unknown';
              const sender = tx.Account || 'Unknown';
              const isZeroValue = amount === 0;

              return (
                <div
                  key={`${tx.hash}-${idx}`}
                  className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-start justify-between hover:bg-white/8 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {isOutgoing ? (
                      <ArrowUp className="w-4 h-4 text-orange-400 mt-0.5" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-green-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white capitalize">
                        {isZeroValue ? tx.TransactionType : (isOutgoing ? 'Sent' : 'Received')} XRP
                      </p>
                      <p className="text-xs text-white/50 font-mono mt-0.5">
                        {isOutgoing ? `To: ${recipient?.slice(0, 12)}...` : `From: ${sender?.slice(0, 12)}...`}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {moment(tx.close_time_iso).fromNow()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${isOutgoing ? 'text-orange-400' : 'text-green-400'}`}>
                      {isOutgoing ? '-' : '+'}{amount.toFixed(6)} XRP
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isZeroValue ? 'Fee Only' : tx.TransactionType}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}