import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ExternalLink, Loader2, Copy, RefreshCw, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Link2 } from 'lucide-react';
import AskAxiButton from '@/components/AskAxiButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from 'sonner';

const TX_TYPE_LABELS = {
  Payment: 'Payment',
  TrustLine: 'TrustLine',
  TrustSet: 'TrustLine',
  OfferCreate: 'Offer',
  OfferDelete: 'Offer Cancel',
  AccountSet: 'Account Set',
  EscrowCreate: 'Escrow',
  EscrowFinish: 'Escrow Finish',
  EscrowCancel: 'Escrow Cancel',
  NFTokenMint: 'NFT Mint',
  NFTokenBurn: 'NFT Burn',
  DIDSet: 'DID Set',
  DIDDelete: 'DID Delete',
};

function DirectionIcon({ direction }) {
  if (direction === 'sent') return <ArrowUpRight className="w-4 h-4 text-red-400" />;
  if (direction === 'received') return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
  return <ArrowLeftRight className="w-4 h-4 text-blue-400" />;
}

export default function TransactionHistory() {
  const [selectedWalletId, setSelectedWalletId] = useState('all');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [walletTxData, setWalletTxData] = useState({});
  const [loadingWallets, setLoadingWallets] = useState({});
  const [fetchedWallets, setFetchedWallets] = useState(new Set());

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user.id }),
    enabled: !!user,
  });

  const fetchTransactionsForWallet = useCallback(async (wallet) => {
    if (!wallet.classic_address) return;
    setLoadingWallets(prev => ({ ...prev, [wallet.id]: true }));
    try {
      const response = await base44.functions.invoke('getWalletTransactions', {
        wallet_id: wallet.id,
        limit: 200
      });
      if (response.data?.success) {
        setWalletTxData(prev => ({
          ...prev,
          [wallet.id]: {
            transactions: response.data.transactions || [],
            network: response.data.network,
            address: response.data.wallet_address,
            walletName: wallet.name,
          }
        }));
        setFetchedWallets(prev => new Set([...prev, wallet.id]));
      }
    } catch (err) {
      console.error(`Failed to fetch txs for ${wallet.name}:`, err);
    } finally {
      setLoadingWallets(prev => ({ ...prev, [wallet.id]: false }));
    }
  }, []);

  // Auto-fetch when wallets load
  useEffect(() => {
    if (wallets.length > 0) {
      wallets.forEach(w => {
        if (!fetchedWallets.has(w.id)) {
          fetchTransactionsForWallet(w);
        }
      });
    }
  }, [wallets]);

  const handleRefresh = () => {
    setFetchedWallets(new Set());
    setWalletTxData({});
    wallets.forEach(w => fetchTransactionsForWallet(w));
  };

  const isLoading = walletsLoading || Object.values(loadingWallets).some(v => v);

  // Merge all transactions with wallet context
  const allTransactions = useMemo(() => {
    const walletsToShow = selectedWalletId === 'all'
      ? Object.entries(walletTxData)
      : Object.entries(walletTxData).filter(([id]) => id === selectedWalletId);

    const merged = [];
    for (const [walletId, data] of walletsToShow) {
      for (const tx of data.transactions) {
        merged.push({ ...tx, walletId, walletName: data.walletName, network: data.network });
      }
    }
    // Sort newest first
    merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return merged;
  }, [walletTxData, selectedWalletId]);

  const filteredTransactions = useMemo(() => {
    let txs = allTransactions;

    if (txTypeFilter !== 'all') {
      txs = txs.filter(tx => {
        if (txTypeFilter === 'Payment') return tx.type === 'Payment';
        if (txTypeFilter === 'TrustLine') return tx.type === 'TrustLine' || tx.type === 'TrustSet';
        return tx.type === txTypeFilter;
      });
    }

    if (statusFilter !== 'all') {
      txs = txs.filter(tx => tx.status === statusFilter);
    }

    if (dateRange !== 'all') {
      const cutoff = subDays(new Date(), parseInt(dateRange));
      txs = txs.filter(tx => tx.date && isAfter(parseISO(tx.date), cutoff));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(tx =>
        tx.hash?.toLowerCase().includes(q) ||
        tx.counterparty?.toLowerCase().includes(q) ||
        tx.currency?.toLowerCase().includes(q) ||
        tx.walletName?.toLowerCase().includes(q)
      );
    }

    return txs;
  }, [allTransactions, txTypeFilter, statusFilter, dateRange, searchQuery]);

  const txTypes = useMemo(() => {
    const types = new Set(allTransactions.map(tx => tx.type));
    return Array.from(types).filter(Boolean);
  }, [allTransactions]);

  const stats = useMemo(() => ({
    total: filteredTransactions.length,
    success: filteredTransactions.filter(t => t.status === 'success').length,
    failed: filteredTransactions.filter(t => t.status === 'failed').length,
    xrpVolume: filteredTransactions
      .filter(t => t.status === 'success' && t.currency === 'XRP' && t.type === 'Payment')
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0),
  }), [filteredTransactions]);

  const getExplorerUrl = (tx) => {
    const base = tx.network === 'mainnet'
      ? 'https://livenet.xrpl.org/transactions/'
      : 'https://testnet.xrpl.org/transactions/';
    return `${base}${tx.hash}`;
  };

  const formatCurrency = (tx) => {
    if (!tx.amount || tx.amount === '0') return '—';
    const amt = parseFloat(tx.amount);
    const curr = tx.currency?.length > 10 ? 'RLUSD' : (tx.currency || 'XRP');
    return `${amt.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${curr}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/70 hover:text-purple-200 text-sm mb-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
            <h1 className="text-2xl font-light tracking-tight text-white">
              Live Transaction <span className="font-semibold">History</span>
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-white/20 text-white/70 hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Transactions', value: stats.total, color: 'text-purple-300' },
            { label: 'Successful', value: stats.success, color: 'text-green-300' },
            { label: 'Failed', value: stats.failed, color: 'text-red-300' },
            { label: 'XRP Volume', value: `${stats.xrpVolume.toFixed(4)} XRP`, color: 'text-blue-300' },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-white/40 mb-1">{s.label}</p>
                <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Wallet filter */}
              <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All Wallets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wallets</SelectItem>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name || w.classic_address?.slice(0, 10)}
                      {loadingWallets[w.id] ? ' ⟳' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="TrustLine">TrustLine</SelectItem>
                  {txTypes.filter(t => t !== 'Payment' && t !== 'TrustLine' && t !== 'TrustSet').map(t => (
                    <SelectItem key={t} value={t}>{TX_TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date range */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search hash, address..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state for individual wallets */}
        {Object.entries(loadingWallets).some(([, v]) => v) && (
          <div className="flex items-center gap-2 text-purple-300/70 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching live transactions from XRPL...
            {Object.entries(loadingWallets).filter(([, v]) => v).map(([id]) => {
              const w = wallets.find(x => x.id === id);
              return w ? <span key={id} className="bg-white/10 px-2 py-0.5 rounded text-xs">{w.name}</span> : null;
            })}
          </div>
        )}

        {/* Table */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-light text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-400" />
              On-Chain Transactions
              <span className="text-sm text-white/40 font-normal ml-2">({filteredTransactions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {walletsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-16 text-white/40">No wallets found.</div>
            ) : filteredTransactions.length === 0 && !isLoading ? (
              <div className="text-center py-16 text-white/40">No transactions match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Wallet</th>
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Direction</th>
                      <th className="text-right py-3 px-4 text-purple-300/50 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Counterparty</th>
                      <th className="text-center py-3 px-4 text-purple-300/50 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-purple-300/50 font-medium">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, i) => (
                      <tr key={`${tx.hash}-${i}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white/50 text-xs whitespace-nowrap">
                          {tx.date ? format(parseISO(tx.date), 'MMM d, yyyy HH:mm') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            {tx.walletName || tx.walletId?.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/80 text-xs">
                          {TX_TYPE_LABELS[tx.type] || tx.type}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <DirectionIcon direction={tx.direction} />
                            <span className="text-xs text-white/60 capitalize">{tx.direction || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white/90 text-xs">
                          {formatCurrency(tx)}
                        </td>
                        <td className="py-3 px-4 text-xs text-white/50 font-mono">
                          {tx.counterparty
                            ? `${tx.counterparty.slice(0, 8)}...${tx.counterparty.slice(-4)}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            tx.status === 'success'
                              ? 'bg-green-500/15 text-green-400 border-green-500/30 text-xs'
                              : 'bg-red-500/15 text-red-400 border-red-500/30 text-xs'
                          }>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {tx.hash ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-purple-300/50 font-mono">
                                {tx.hash.slice(0, 8)}…
                              </span>
                              <button
                                onClick={() => { navigator.clipboard.writeText(tx.hash); toast.success('Hash copied'); }}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <Copy className="w-3 h-3 text-purple-400" />
                              </button>
                              <a
                                href={getExplorerUrl(tx)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <ExternalLink className="w-3 h-3 text-purple-400" />
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
    </div>
  );
}