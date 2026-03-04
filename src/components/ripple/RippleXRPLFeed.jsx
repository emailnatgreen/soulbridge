import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, CheckCircle2, Globe, Wallet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function RippleXRPLFeed({ wallets, monitoredWallets }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);

  const fetchLiveTransactions = async () => {
    setLoading(true);
    try {
      const allTxs = [];
      for (const wallet of wallets.slice(0, 5)) {
        if (!wallet.classic_address || wallet.classic_address.startsWith('rAxi') || wallet.classic_address.startsWith('rZoe')) continue;
        try {
          const res = await base44.functions.invoke('getWalletTransactions', { address: wallet.classic_address, limit: 5 });
          if (res.data?.transactions) {
            res.data.transactions.forEach(tx => {
              allTxs.push({ ...tx, wallet_name: wallet.name, wallet_address: wallet.classic_address });
            });
          }
        } catch (e) {
          // skip failed wallet
        }
      }
      allTxs.sort((a, b) => (b.date || 0) - (a.date || 0));
      setTransactions(allTxs.slice(0, 20));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveTransactions();
    const interval = setInterval(fetchLiveTransactions, 30000);
    return () => clearInterval(interval);
  }, [wallets.length]);

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('Hash copied');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatAmount = (tx) => {
    if (tx.Amount && typeof tx.Amount === 'string') {
      return `${(parseInt(tx.Amount) / 1000000).toFixed(2)} XRP`;
    }
    if (tx.Amount && typeof tx.Amount === 'object') {
      return `${tx.Amount.value} ${tx.Amount.currency}`;
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      {/* Wallet Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Monitored Wallets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {wallets.filter(w => w.classic_address && !w.classic_address.startsWith('rAxi') && !w.classic_address.startsWith('rZoe')).map(wallet => (
            <Card key={wallet.id} className="bg-white border-blue-100 hover:border-blue-300 transition-all">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 truncate">{wallet.name}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{(wallet.balance || 0).toFixed(4)} <span className="text-xs font-normal text-blue-600">XRP</span></p>
                <p className="text-xs text-gray-400 mt-1 truncate font-mono">{wallet.classic_address?.slice(0, 14)}...</p>
                <a
                  href={`https://livenet.xrpl.org/accounts/${wallet.classic_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> View on XRPL
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Live Transaction Feed */}
      <Card className="bg-white border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Live XRPL Transaction Feed
              <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1 animate-pulse" />
                Auto-refresh 30s
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchLiveTransactions} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Fetching live XRPL data...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recent transactions found</p>
              <p className="text-xs mt-1">Transactions will appear here when wallets are active</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Wallet</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Type</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Amount</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{tx.wallet_name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-gray-700">{tx.TransactionType || tx.transaction?.TransactionType || '—'}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs font-semibold text-gray-900">{formatAmount(tx.transaction || tx)}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-xs ${(tx.meta?.TransactionResult || tx.TransactionResult) === 'tesSUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {(tx.meta?.TransactionResult || tx.TransactionResult) === 'tesSUCCESS' ? '✓ Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-gray-400">{(tx.hash || tx.transaction?.hash || '').slice(0, 10)}...</span>
                          {(tx.hash || tx.transaction?.hash) && (
                            <>
                              <button onClick={() => copyHash(tx.hash || tx.transaction?.hash)} className="text-gray-400 hover:text-blue-600">
                                {copiedHash === (tx.hash || tx.transaction?.hash) ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <a href={`https://livenet.xrpl.org/transactions/${tx.hash || tx.transaction?.hash}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}