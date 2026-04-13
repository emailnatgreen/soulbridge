import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Inbox, Clock, CheckCircle, X, RefreshCw, ArrowLeft, Users, Send, Loader2, PenSquare, Search, BookUser } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import InquiryCard from '@/components/admin/InquiryCard';
import ContactListPanel from '@/components/admin/ContactListPanel';

const CATEGORY_COLORS = {
  'Technical Support': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Partnership': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Donation': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'General Enquiry': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  'Feedback': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Media / Press': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Membership': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'Other': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const QUEUE_LABELS = {
  support: '🛠 Support',
  partnerships: '🤝 Partnerships',
  finance: '💰 Finance',
  general: '📬 General',
  media: '📰 Media',
};

const STATUS_FILTER_TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'new', label: 'New', icon: Mail },
  { key: 'in_review', label: 'In Review', icon: Clock },
  { key: 'responded', label: 'Responded', icon: CheckCircle },
  { key: 'closed', label: 'Closed', icon: X },
  { key: 'invites', label: 'Invites', icon: Users },
  { key: 'contacts', label: 'Contacts', icon: BookUser },
];

const QUEUE_FILTER_TABS = [
  { key: 'all_queues', label: 'All Queues' },
  { key: 'support', label: '🛠 Support' },
  { key: 'partnerships', label: '🤝 Partnerships' },
  { key: 'finance', label: '💰 Finance' },
  { key: 'general', label: '📬 General' },
  { key: 'media', label: '📰 Media' },
];

export default function AdminInquiries() {
  const [filter, setFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('all_queues');
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  const handleComposeSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setComposeSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        from_name: 'SoulBridge Foundation',
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        body: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p style="color: #1f2937; font-size: 14px; white-space: pre-wrap;">${composeBody.trim()}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">Nathan Green<br/>SoulBridge Foundation<br/>support@soulbridge-foundation.org</p>
</div>`,
      });
      toast.success('Email sent!');
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err) {
      toast.error('Failed to send email: ' + (err.message || 'Unknown error'));
    }
    setComposeSending(false);
  };

  const { data: inquiries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-inquiries'],
    queryFn: () => base44.entities.Inquiry.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const { data: inviteTokens = [] } = useQuery({
    queryKey: ['admin-invite-tokens'],
    queryFn: () => base44.entities.InvitationToken.list('-created_date', 100),
    refetchInterval: 60000,
  });

  const filteredByStatus = filter === 'invites' || filter === 'contacts'
    ? []
    : filter === 'all'
      ? inquiries
      : inquiries.filter(i => i.status === filter);

  const filteredByQueue = queueFilter === 'all_queues'
    ? filteredByStatus
    : filteredByStatus.filter(i => i.queue === queueFilter);

  const filtered = search.trim()
    ? filteredByQueue.filter(i =>
        i.subject?.toLowerCase().includes(search.toLowerCase()) ||
        i.sender_email?.toLowerCase().includes(search.toLowerCase()) ||
        i.message?.toLowerCase().includes(search.toLowerCase()) ||
        i.category?.toLowerCase().includes(search.toLowerCase())
      )
    : filteredByQueue;

  const counts = {
    all: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    in_review: inquiries.filter(i => i.status === 'in_review').length,
    responded: inquiries.filter(i => i.status === 'responded').length,
    closed: inquiries.filter(i => i.status === 'closed').length,
    invites: inviteTokens.length,
  };

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-5 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link to="/dashboard" className="text-slate-500 hover:text-white transition-colors lg:hidden">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <span className="truncate">Inquiries & Contacts</span>
              </h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm ml-10 sm:ml-11">
              Manage incoming messages. Reply via your email client.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => setComposeOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs"
            >
              <PenSquare className="w-3.5 h-3.5" />
              Compose
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by subject, email or message..."
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          {STATUS_FILTER_TABS.map(tab => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
                  active
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {tab.label}
                {(tab.key === 'contacts' || counts[tab.key] > 0) && (
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

        {/* Queue Filter Tabs */}
        {filter !== 'invites' && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            {QUEUE_FILTER_TABS.map(tab => {
              const active = queueFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setQueueFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap flex-shrink-0 border ${
                    active
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'text-slate-500 border-slate-700/50 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : filter === 'contacts' ? (
          <ContactListPanel />
        ) : filter === 'invites' ? (
          /* Invite Tokens List */
          inviteTokens.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No invite tokens found.</p>
              <Link to="/InviteLinkManager" className="text-purple-400 text-xs hover:underline mt-2 inline-block">
                Go to Invite Manager →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {inviteTokens.map(token => (
                <div key={token.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${
                        token.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        token.status === 'claimed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>{token.status}</Badge>
                      <span className="text-white text-sm font-mono">{token.token_id || token.hash?.slice(0, 8)}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{token.created_date?.slice(0, 10)}</span>
                  </div>
                  {token.recipient_nickname && (
                    <p className="text-slate-400 text-xs mt-1.5">For: {token.recipient_nickname}</p>
                  )}
                  {token.notes && (
                    <p className="text-slate-500 text-[11px] mt-1">{token.notes}</p>
                  )}
                </div>
              ))}
              <div className="text-center pt-2">
                <Link to="/InviteLinkManager" className="text-purple-400 text-xs hover:underline">
                  Full Invite Manager →
                </Link>
              </div>
            </div>
          )
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

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Compose New Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">To</label>
              <Input
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                placeholder="recipient@email.com"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Subject</label>
              <Input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Subject..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Message</label>
              <Textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                rows={6}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
            <Button
              onClick={handleComposeSend}
              disabled={composeSending}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
            >
              {composeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {composeSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}