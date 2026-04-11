import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Mail, Clock, CheckCircle, Eye, X, Copy, MessageSquare, Save, ChevronDown, ChevronUp, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  in_review: { label: 'In Review', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  responded: { label: 'Responded', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function InquiryCard({ inquiry, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(inquiry.response || '');
  const [replyNote, setReplyNote] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_CONFIG[inquiry.status] || STATUS_CONFIG.new;

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    const updateData = { status: newStatus };
    if (newStatus === 'responded' && response.trim()) {
      updateData.response = response;
    }
    await base44.entities.Inquiry.update(inquiry.id, updateData);
    setSaving(false);
    onUpdate?.();
  };

  const handleSaveResponse = async () => {
    setSaving(true);
    await base44.entities.Inquiry.update(inquiry.id, { response, status: 'responded' });
    setSaving(false);
    onUpdate?.();
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Re: ${inquiry.subject || 'Your enquiry'}`);
    const bodyText = response.trim()
      ? response + '\n\n---\nNathan Green\nSoulBridge Foundation\nsupport@soulbridge-foundation.org'
      : `Hi,\n\nThank you for reaching out to SoulBridge Foundation.\n\n---\nNathan Green\nSoulBridge Foundation\nsupport@soulbridge-foundation.org`;
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${inquiry.sender_email}?subject=${subject}&body=${body}`;
    base44.entities.Inquiry.update(inquiry.id, { response, status: 'responded' }).then(() => onUpdate?.());
    toast.success('Email client opened!');
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(inquiry.sender_email);
    toast.success('Email copied!');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this inquiry permanently?')) return;
    setDeleting(true);
    await base44.entities.Inquiry.delete(inquiry.id);
    toast.success('Inquiry deleted');
    onUpdate?.();
  };

  const handleReopen = async () => {
    setSaving(true);
    await base44.entities.Inquiry.update(inquiry.id, { status: 'new' });
    setSaving(false);
    toast.success('Inquiry reopened');
    onUpdate?.();
  };



  return (
    <Card className="bg-slate-900/60 border-slate-700/50 hover:border-slate-600/70 transition-colors">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
              <span className="text-slate-500 text-xs">{moment(inquiry.created_date).fromNow()}</span>
              {inquiry.source && <span className="text-slate-600 text-[10px]">via {inquiry.source}</span>}
              {inquiry.reply_note && <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">Reply Logged</Badge>}
            </div>
            <h3 className="text-white font-medium text-sm truncate">{inquiry.subject}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 text-xs font-mono">{inquiry.sender_email}</span>
              <button onClick={copyEmail} className="text-slate-500 hover:text-white transition-colors" title="Copy email">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            {!expanded && inquiry.message && (
              <p className="text-slate-500 text-xs mt-1.5 truncate">{inquiry.message}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Message */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Message</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{inquiry.message}</p>
            </div>

            {/* Response Area */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase">Internal Notes / Response</p>
              <Textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Write your response notes here..."
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 text-sm min-h-[80px]"
              />
            </div>

            {/* Their Reply Note */}
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Log Their Reply
              </p>
              {inquiry.reply_note && (
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-2.5 mb-3">
                  <p className="text-[10px] text-green-500 font-semibold uppercase mb-1">Logged reply</p>
                  <p className="text-green-300 text-xs whitespace-pre-wrap">{inquiry.reply_note}</p>
                </div>
              )}
              <Textarea
                value={replyNote}
                onChange={e => setReplyNote(e.target.value)}
                placeholder={inquiry.reply_note ? 'Update their reply note...' : 'Paste or type what they replied here so you have a record...'}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 text-sm min-h-[70px]"
              />
              <Button
                onClick={async () => {
                  setSavingReply(true);
                  await base44.entities.Inquiry.update(inquiry.id, { reply_note: replyNote });
                  setSavingReply(false);
                  setReplyNote('');
                  toast.success('Reply logged!');
                  onUpdate?.();
                }}
                size="sm"
                disabled={savingReply || !replyNote.trim()}
                className="mt-2 bg-green-700/30 hover:bg-green-700/50 text-green-300 border border-green-600/30 gap-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {savingReply ? 'Saving...' : 'Save Reply Note'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap border-t border-slate-700/50 pt-4">
              <Button
                onClick={handleSendEmail}
                size="sm"
                disabled={!inquiry.sender_email}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                Reply via Email
              </Button>
              <Button
                onClick={handleSaveResponse}
                size="sm"
                variant="outline"
                disabled={saving || !response.trim()}
                className="border-green-600/40 text-green-400 hover:bg-green-600/20 gap-1.5 text-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Responded
              </Button>
              {inquiry.status !== 'in_review' && inquiry.status !== 'closed' && (
                <Button
                  onClick={() => handleStatusChange('in_review')}
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  className="text-yellow-400 hover:bg-yellow-500/10 gap-1.5 text-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  In Review
                </Button>
              )}
              {inquiry.status !== 'closed' && (
                <Button
                  onClick={() => handleStatusChange('closed')}
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  className="text-slate-400 hover:bg-slate-700 gap-1.5 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </Button>
              )}
              {inquiry.status === 'closed' && (
                <Button
                  onClick={handleReopen}
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  className="text-blue-400 hover:bg-blue-500/10 gap-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen
                </Button>
              )}
              <Button
                onClick={handleDelete}
                size="sm"
                variant="ghost"
                disabled={deleting}
                className="text-red-500 hover:bg-red-500/10 gap-1.5 text-xs ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}