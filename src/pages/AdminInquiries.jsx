import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Inbox, Clock, CheckCircle, X, RefreshCw } from 'lucide-react';
import InquiryCard from '@/components/admin/InquiryCard';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'new', label: 'New', icon: Mail },
  { key: 'in_review', label: 'In Review', icon: Clock },
  { key: 'responded', label: 'Responded', icon: CheckCircle },
  { key: 'closed', label: 'Closed', icon: X },
];

export default function AdminInquiries() {
  const [filter, setFilter] = useState('all');

  const { data: inquiries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-inquiries'],
    queryFn: () => base44.entities.Inquiry.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter);
  const counts = {
    all: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    in_review: inquiries.filter(i => i.status === 'in_review').length,
    responded: inquiries.filter(i => i.status === 'responded').length,
    closed: inquiries.filter(i => i.status === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              Inquiries & Contacts
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage incoming messages from the public contact form. Reply via your own email client.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 hide-scrollbar">
          {FILTER_TABS.map(tab => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {counts[tab.key] > 0 && (
                  <Badge className={`text-[9px] px-1.5 py-0 ${
                    active ? 'bg-purple-500/30 text-purple-200' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {counts[tab.key]}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No inquiries {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inquiry => (
              <InquiryCard key={inquiry.id} inquiry={inquiry} onUpdate={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}