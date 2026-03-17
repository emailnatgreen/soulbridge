import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Clock, Hash, Download, ExternalLink } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import FilterBar from '@/components/filters/FilterBar';

const TX_FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'completed', 'failed'] },
  { key: 'dateRange', label: 'Date Range', type: 'daterange' },
  { key: 'amountRange', label: 'Amount (XRP)', type: 'range', min: 0, max: 10000 },
  { key: 'address', label: 'Address', type: 'text', placeholder: 'rXXX...' },
];

const SORT_OPTIONS = [
  { value: '-created_date', label: 'Newest First' },
  { value: 'created_date', label: 'Oldest First' },
  { value: '-amount', label: 'Amount (High)' },
  { value: 'amount', label: 'Amount (Low)' },
];

function exportCSV(txs) {
  const rows = [['Date', 'Recipient', 'Address', 'Amount XRP', 'Status', 'Hash']];
  txs.forEach(t => rows.push([
    t.created_date ? format(parseISO(t.created_date), 'yyyy-MM-dd HH:mm') : '',
    t.recipient_name || '', t.recipient_address || '',
    t.amount || 0, t.status || '', t.hash || '',
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `transactions-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionHistory() {
  const [filterValues, setFilterValues] = useState({ search: '', status: 'all', dateRange: {}, amountRange: { min: 0, max: 10000 }, address: '' });
  const [sortBy, setSortBy] = useState('-created_date');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 200),
  });

  const filtered = transactions.filter(t => {
    const q = filterValues.search?.toLowerCase();
    if (q && !`${t.recipient_name} ${t.recipient_address} ${t.note} ${t.hash}`.toLowerCase().includes(q)) return false;
    if (filterValues.status !== 'all' && t.status !== filterValues.status) return false;
    if (filterValues.address && !`${t.recipient_address}`.toLowerCase().includes(filterValues.address.toLowerCase())) return false;
    if (filterValues.amountRange?.min > 0 && (t.amount ?? 0) < filterValues.amountRange.min) return false;
    if (filterValues.amountRange?.max < 10000 && (t.amount ?? 0) > filterValues.amountRange.max) return false;
    if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
      try {
        const d = parseISO(t.created_date);
        if (filterValues.dateRange.from && d < new Date(filterValues.dateRange.from)) return false;
        if (filterValues.dateRange.to && d > new Date(filterValues.dateRange.to)) return false;
      } catch { /* skip */ }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === '-created_date') return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === 'created_date') return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === '-amount') return (b.amount ?? 0) - (a.amount ?? 0);
    if (sortBy === 'amount') return (a.amount ?? 0) - (b.amount ?? 0);
    return 0;
  });

  const totalSent = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Transaction History</h1>
            <p className="text-slate-400 text-sm mt-1">{transactions.length} total transactions</p>
          </div>
          <Button onClick={() => exportCSV(filtered)} variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Txns', val: transactions.length, color: 'text-white' },
            { label: 'Completed', val: transactions.filter(t => t.status === 'completed').length, color: 'text-green-400' },
            { label: 'Pending', val: transactions.filter(t => t.status === 'pending').length, color: 'text-amber-400' },
            { label: 'Total Sent', val: `${totalSent.toFixed(2)} XRP`, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={TX_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search recipient, hash, note…"
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          resultCount={filtered.length}
        />

        {/* Transaction List */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading transactions…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No transactions match your filters.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => (
              <Card key={tx.id} className="bg-slate-900/60 border-slate-700/40 hover:border-slate-600 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tx.status === 'completed' ? 'bg-green-500/10 border border-green-500/30' : tx.status === 'failed' ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                      <ArrowUpRight className={`w-4 h-4 ${tx.status === 'completed' ? 'text-green-400' : tx.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{tx.recipient_name || 'Unknown'}</span>
                        <span className="text-slate-500 text-xs font-mono truncate max-w-[160px]">{tx.recipient_address}</span>
                        <Badge className={`text-xs border ${tx.status === 'completed' ? 'bg-green-900/40 text-green-300 border-green-700/40' : tx.status === 'failed' ? 'bg-red-900/40 text-red-300 border-red-700/40' : 'bg-amber-900/40 text-amber-300 border-amber-700/40'}`}>
                          {tx.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {tx.created_date ? format(parseISO(tx.created_date), 'MMM d, yyyy HH:mm') : 'Unknown'}
                        </span>
                        {tx.note && <span className="text-xs text-slate-500 truncate">"{tx.note}"</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white font-semibold">{tx.amount} XRP</div>
                      {tx.hash && (
                        <a href={`https://xrpscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end mt-0.5">
                          <Hash className="w-3 h-3" />View
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}