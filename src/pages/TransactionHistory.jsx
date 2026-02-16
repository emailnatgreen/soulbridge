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
              <div className="space-y-3">
                {filteredAndSortedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">
                            {tx.recipient_name || 'Unknown Recipient'}
                          </h3>
                          <Badge className={getStatusBadge(tx.status)}>
                            {tx.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-purple-300/60">
                            <span className="font-mono text-xs">
                              {tx.recipient_address}
                            </span>
                            {tx.destination_tag && (
                              <span className="text-xs bg-white/5 px-2 py-0.5 rounded">
                                Tag: {tx.destination_tag}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-white/50">
                            {format(new Date(tx.created_date), 'PPpp')}
                          </div>
                          
                          {tx.note && (
                            <div className="text-white/70 italic text-xs mt-2">
                              "{tx.note}"
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-2xl font-light text-white mb-2">
                          {tx.amount?.toFixed(6)} <span className="text-sm text-purple-300/60">XRP</span>
                        </p>
                        {tx.hash && (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            View on Explorer
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}