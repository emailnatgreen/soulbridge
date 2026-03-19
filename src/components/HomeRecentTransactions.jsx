import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Loader2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const TX_TYPE_LABELS = {
  Payment: 'Payment', TrustLine: 'TrustLine', TrustSet: 'TrustLine',
  DIDSet: 'DID Set', DIDDelete: 'DID Delete', AccountSet: 'Account Set',
  OfferCreate: 'Offer', NFTokenMint: 'NFT Mint',
};

function DirectionIcon({ direction }) {
  if (direction === 'sent') return <ArrowUpRight className="w-4 h-4 text-red-400" />;
  if (direction === 'received') return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
  return <ArrowLeftRight className="w-4 h-4 text-blue-400" />;
}

export default function HomeRecentTransactions() {
  const [txData, setTxData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, volume: 0 });

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-home', user?.id],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user.id }),
    enabled: !!user,
  });

  // Fallback: local DB transactions
  const { data: dbTransactions = [] } = useQuery({
    queryKey: ['transactions-local'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 20),
  });

  const fetchLiveTxs = useCallback(async () => {
    if (!wallets.length) return;
    setLoading(true);
    const all = [];
    await Promise.all(wallets.map(async (w) => {
      if (!w.classic_address) return;
      try {
        const res = await base44.functions.invoke('getWalletTransactions', { wallet_id: w.id, limit: 20 });
        if (res.data?.success) {
          res.data.transactions.forEach(tx => all.push({ ...tx, walletName: w.name, network: res.data.network }));
        }
      } catch (_) {}
    }));

    all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const recent = all.slice(0, 10);
    setTxData(recent);

    const volume = all
      .filter(t => t.status === 'success' && t.currency === 'XRP' && t.type === 'Payment')
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    setStats({
      total: all.length,
      success: all.filter(t => t.status === 'success').length,
      failed: all.filter(t => t.status === 'failed').length,
      volume,
    });
    setLoading(false);
  }, [wallets]);

  useEffect(() => { fetchLiveTxs(); }, [fetchLiveTxs]);

  const getExplorerUrl = (tx) =>
    `${tx.network === 'mainnet' ? 'https://livenet.xrpl.org' : 'https://testnet.xrpl.org'}/transactions/${tx.hash}`;

  const formatAmt = (tx) => {
    if (!tx.amount || tx.amount === '0') return '—';
    const curr = tx.currency?.length > 10 ? 'RLUSD' : (tx.currency || 'XRP');
    return `${parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${curr}`;
  };

  const showFallback = !loading && txData.length === 0 && dbTransactions.length > 0;

  return (
    <div>
      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total On-Chain', value: stats.total, color: 'text-purple-400' },
          { label: 'Successful', value: stats.success, color: 'text-green-400' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          { label: 'XRP Volume', value: `${stats.volume.toFixed(4)} XRP`, color: 'text-blue-400' },
        ].map(s => (
          <Card key={s.label} className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-white/60 mb-1">{s.label}</p>
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction Table */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-xl font-light text-white flex items-center gap-2">
            Recent Live Transactions
            {loading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveTxs}
              disabled={loading}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-white/60 hover:text-white/80 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link to={createPageUrl('TransactionHistory')} className="text-xs text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && txData.length === 0 ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-6 h-6 text-purple-400 animate-spin mr-2" />
             <span className="text-white/60 text-sm">Fetching live data from XRPL...</span>
           </div>
          ) : txData.length === 0 && dbTransactions.length === 0 ? (
           <div className="text-center py-12 text-white/40 text-sm">No transactions found.</div>
          ) : showFallback ? (
           // Fallback: show local DB transactions
           <div className="overflow-x-auto">
             <div className="px-4 py-2 text-xs text-amber-300 bg-amber-500/20 border-b border-amber-500/30 flex items-center gap-1">
               ⚡ Showing saved transactions — connect a wallet to see live XRPL data
             </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium text-xs">Date</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium text-xs">Type</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium text-xs">Amount</th>
                    <th className="text-center py-3 px-4 text-white/60 font-medium text-xs">Status</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium text-xs">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {dbTransactions.map((tx, i) => (
                    <tr key={tx.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white/40 text-xs whitespace-nowrap">
                        {tx.created_date ? format(parseISO(tx.created_date), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs capitalize">{tx.transaction_type || tx.type || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-800 text-xs">
                        {tx.amount ? `${parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.currency || 'XRP'}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          tx.status === 'success' || tx.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200 text-xs'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200 text-xs'
                            : 'bg-red-100 text-red-600 border-red-200 text-xs'
                        }>
                          {tx.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {tx.hash || tx.transaction_hash ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 font-mono">{(tx.hash || tx.transaction_hash).slice(0, 8)}…</span>
                            <button onClick={() => { navigator.clipboard.writeText(tx.hash || tx.transaction_hash); toast.success('Copied'); }} className="p-1 hover:bg-gray-100 rounded">
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Live XRPL transactions
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Wallet</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Dir</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">Amount</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-xs">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {txData.map((tx, i) => (
                    <tr key={`${tx.hash}-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {tx.date ? format(parseISO(tx.date), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {tx.walletName || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{TX_TYPE_LABELS[tx.type] || tx.type}</td>
                      <td className="py-3 px-4">
                        <DirectionIcon direction={tx.direction} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-800 text-xs">{formatAmt(tx)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          tx.status === 'success'
                            ? 'bg-green-100 text-green-700 border-green-200 text-xs'
                            : 'bg-red-100 text-red-600 border-red-200 text-xs'
                        }>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {tx.hash ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 font-mono">{tx.hash.slice(0, 8)}…</span>
                            <button onClick={() => { navigator.clipboard.writeText(tx.hash); toast.success('Copied'); }} className="p-1 hover:bg-gray-100 rounded">
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                            <a href={getExplorerUrl(tx)} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 rounded">
                              <ExternalLink className="w-3 h-3 text-blue-400" />
                            </a>
                          </div>
                        ) : '—'}
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