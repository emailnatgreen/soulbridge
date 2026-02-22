import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowUpRight, ArrowDownLeft, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import WalletAIInsights from './WalletAIInsights';

export default function WalletTransactionHistory({ wallet }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet-transactions', wallet.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getWalletTransactions', {
        wallet_id: wallet.id,
        limit: 100
      });
      return response.data;
    },
    enabled: !!wallet
  });

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Failed to load transactions</p>
        </CardContent>
      </Card>
    );
  }

  const transactions = data?.transactions || [];

  return (
    <Tabs defaultValue="history" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-white/5">
        <TabsTrigger value="history">Transaction History</TabsTrigger>
        <TabsTrigger value="insights">AI Insights</TabsTrigger>
      </TabsList>
      
      <TabsContent value="history">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Transaction History</CardTitle>
            <p className="text-sm text-purple-300/60">
              {wallet.classic_address} • {wallet.network}
            </p>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm">No transactions yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {transactions.map((tx, idx) => (
                <div
                  key={tx.hash || idx}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {tx.direction === 'sent' ? (
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                      ) : tx.direction === 'received' ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-400" />
                      ) : (
                        <LinkIcon className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-white font-medium text-sm">
                        {tx.type === 'TrustLine' ? 'TrustLine Set' : tx.direction}
                      </span>
                    </div>
                    <Badge 
                      variant={tx.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-white/40">Amount:</span>
                      <p className="text-white font-medium">
                        {parseFloat(tx.amount).toFixed(6)} {tx.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/40">Date:</span>
                      <p className="text-white/80">
                        {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {tx.counterparty && (
                      <div className="col-span-2">
                        <span className="text-white/40">Counterparty:</span>
                        <p className="text-white/80 text-xs font-mono truncate">
                          {tx.counterparty}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-white/40">Hash:</span>
                      <p className="text-purple-400/80 text-xs font-mono truncate">
                        {tx.hash}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="insights">
        <WalletAIInsights wallet={wallet} transactions={transactions} />
      </TabsContent>
    </Tabs>
  );
}