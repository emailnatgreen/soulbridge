import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Mail, Clock, CheckCircle, Eye, X, ExternalLink, Copy } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
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
    const body = encodeURIComponent(response + '\n\n---\nNathan Green\nSoulBridge Foundation\nsupport@soulbridge-foundation.org');
    window.location.href = `mailto:${inquiry.sender_email}?subject=${subject}&body=${body}`;
    base44.entities.Inquiry.update(inquiry.id, { response, status: 'responded' }).then(() => onUpdate?.());
    toast.success('Email client opened!');
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(inquiry.sender_email);
  };

  const openMailto = () => {
    const subject = encodeURIComponent(`Re: ${inquiry.subject}`);
    const body = encodeURIComponent(`Hi,\n\nThank you for contacting SoulBridge Foundation.\n\n---\nOriginal message:\n${inquiry.message}\n\n---\nBest regards,\nSoulBridge Foundation Support\nsupport@soulbridge-foundation.org`);
    window.location.href = `mailto:${inquiry.sender_email}?subject=${subject}&body=${body}`;
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
            </div>
            <h3 className="text-white font-medium text-sm truncate">{inquiry.subject}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 text-xs font-mono">{inquiry.sender_email}</span>
              <button onClick={copyEmail} className="text-slate-500 hover:text-white transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white"
          >
            {expanded ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleSendEmail}
                size="sm"
                disabled={!response.trim() || !inquiry.sender_email}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                Reply via Email
              </Button>
              <Button
                onClick={openMailto}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-400 hover:text-white gap-1.5 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Mail App
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
              {inquiry.status !== 'in_review' && (
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}