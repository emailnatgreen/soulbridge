import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ExternalLink, Loader2, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TransactionHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_date');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 500),
  });

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Filter by search query (name or address)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.recipient_name?.toLowerCase().includes(query) ||
        t.recipient_address?.toLowerCase().includes(query) ||
        t.note?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case '-created_date':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'created_date':
          return new Date(a.created_date) - new Date(b.created_date);
        case '-amount':
          return b.amount - a.amount;
        case 'amount':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return sorted;
  }, [transactions, statusFilter, searchQuery, sortBy]);

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'bg-green-500/10 text-green-400 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return variants[status] || variants.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Transaction <span className="font-semibold">History</span>
          </h1>
          <p className="text-sm text-purple-300/60 mt-1">View and manage all XRP transactions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Filters and Search */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search by name, address, or note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Date (Newest)</SelectItem>
                  <SelectItem value="created_date">Date (Oldest)</SelectItem>
                  <SelectItem value="-amount">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-purple-300/60 mb-1">Total Transactions</p>
              <p className="text-2xl font-light text-white">{filteredAndSortedTransactions.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-green-300/60 mb-1">Completed</p>
              <p className="text-2xl font-light text-white">
                {filteredAndSortedTransactions.filter(t => t.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-300/60 mb-1">Pending</p>
              <p className="text-2xl font-light text-white">
                {filteredAndSortedTransactions.filter(t => t.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-purple-300/60 mb-1">Total Volume</p>
              <p className="text-2xl font-light text-white">
                {filteredAndSortedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)} XRP
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-300/60 mb-1">Treasury Fees (5%)</p>
              <p className="text-2xl font-light text-white">
                {(filteredAndSortedTransactions
                  .filter(t => t.status === 'completed')
                  .reduce((sum, t) => sum + ((t.amount || 0) * 0.05), 0)).toFixed(2)} XRP
              </p>
            </CardContent>
          </Card>
          </div>

        {/* Transaction List */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">
              Transactions ({filteredAndSortedTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : filteredAndSortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b border-white/10">
                       <th className="text-left py-3 px-4 text-purple-300/60 font-medium">Recipient</th>
                       <th className="text-right py-3 px-4 text-purple-300/60 font-medium">Original Amount</th>
                       <th className="text-right py-3 px-4 text-purple-300/60 font-medium">Treasury Fee (5%)</th>
                       <th className="text-right py-3 px-4 text-purple-300/60 font-medium">Net Amount</th>
                       <th className="text-center py-3 px-4 text-purple-300/60 font-medium">Status</th>
                       <th className="text-left py-3 px-4 text-purple-300/60 font-medium">Transaction Hash</th>
                       <th className="text-left py-3 px-4 text-purple-300/60 font-medium">Timestamp</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredAndSortedTransactions.map((tx) => {
                       const fee = tx.status === 'completed' ? (tx.amount || 0) * 0.05 : 0;
                       const netAmount = (tx.amount || 0) - fee;
                       return (
                         <tr key={tx.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                           <td className="py-3 px-4">
                             <div>
                               <p className="text-white font-medium">{tx.recipient_name || 'Unknown'}</p>
                               <p className="text-xs text-purple-300/60 font-mono">{tx.recipient_address?.slice(0, 12)}...{tx.recipient_address?.slice(-6)}</p>
                               {tx.destination_tag && <p className="text-xs text-white/40 mt-1">Tag: {tx.destination_tag}</p>}
                             </div>
                           </td>
                           <td className="py-3 px-4 text-right text-white font-light">
                             {(tx.amount || 0).toFixed(6)} XRP
                           </td>
                           <td className="py-3 px-4 text-right text-blue-300/80 font-light">
                             {fee > 0 ? `${fee.toFixed(6)} XRP` : '—'}
                           </td>
                           <td className="py-3 px-4 text-right text-green-300/80 font-light">
                             {netAmount.toFixed(6)} XRP
                           </td>
                           <td className="py-3 px-4 text-center">
                             <Badge className={getStatusBadge(tx.status)}>
                               {tx.status}
                             </Badge>
                           </td>
                           <td className="py-3 px-4">
                             {tx.hash ? (
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-purple-300/60 font-mono">{tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}</span>
                                 <button
                                   onClick={() => {
                                     navigator.clipboard.writeText(tx.hash);
                                     toast.success('Hash copied');
                                   }}
                                   className="p-1 hover:bg-white/10 rounded transition-colors"
                                 >
                                   <Copy className="w-3 h-3 text-purple-400" />
                                 </button>
                                 <a
                                   href={`https://testnet.xrpl.org/transactions/${tx.hash}`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="p-1 hover:bg-white/10 rounded transition-colors"
                                 >
                                   <ExternalLink className="w-3 h-3 text-purple-400" />
                                 </a>
                               </div>
                             ) : '—'}
                           </td>
                           <td className="py-3 px-4 text-white/60 text-xs">
                             {format(new Date(tx.created_date), 'MMM d, yyyy HH:mm:ss')}
                           </td>
                         </tr>
                       );
                     })}
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