import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Inbox, Clock, CheckCircle, X, RefreshCw, ArrowLeft, Users, Send, Loader2, PenSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import InquiryCard from '@/components/admin/InquiryCard';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'new', label: 'New', icon: Mail },
  { key: 'in_review', label: 'In Review', icon: Clock },
  { key: 'responded', label: 'Responded', icon: CheckCircle },
  { key: 'closed', label: 'Closed', icon: X },
  { key: 'invites', label: 'Invites', icon: Users },
];

export default function AdminInquiries() {
  const [filter, setFilter] = useState('all');
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
    await base44.integrations.Core.SendEmail({
      to: composeTo.trim(),
      subject: composeSubject.trim(),
      body: composeBody + '\n\n---\nBest regards,\nSoulBridge Foundation Support\nsupport@soulbridge-foundation.org',
      from_name: 'SoulBridge Foundation'
    });
    setComposeSending(false);
    toast.success('Email sent!');
    setComposeOpen(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
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

  const filtered = filter === 'invites' 
    ? [] 
    : filter === 'all' 
      ? inquiries 
      : inquiries.filter(i => i.status === filter);

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

        {/* Filter Tabs — mobile scrollable */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1.5 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          {FILTER_TABS.map(tab => {
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