import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionList({ transactions, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
          <ArrowUpRight className="w-8 h-8 text-purple-600" />
        </div>
        <p className="text-gray-500 text-sm">No transactions yet</p>
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', label: 'Pending' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: 'Failed' }
  };

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const config = statusConfig[tx.status] || statusConfig.pending;
        const Icon = config.icon;

        return (
          <div
            key={tx.id}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                  <ArrowUpRight className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900 font-medium truncate">
                      {tx.recipient_name || 'Unknown Recipient'}
                    </p>
                    <Badge className={`${config.bg} ${config.color} border ${config.border} text-xs`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-xs font-mono truncate">{tx.recipient_address}</p>
                  {tx.note && (
                    <p className="text-gray-600 text-sm mt-1">{tx.note}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    {format(new Date(tx.created_date), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-light text-gray-900">
                  {tx.amount.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">XRP</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}