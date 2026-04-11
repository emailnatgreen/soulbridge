import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  Mail, Clock, CheckCircle, X, Copy, MessageSquare, Save,
  ChevronDown, ChevronUp, RotateCcw, Trash2, Sparkles,
  Loader2, AlertTriangle, Smile, Meh, Frown, Tag, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import ReactQuill from 'react-quill';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  in_review: { label: 'In Review', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  responded: { label: 'Responded', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', icon: Smile, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  neutral: { label: 'Neutral', icon: Meh, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  negative: { label: 'Negative', icon: Frown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  urgent: { label: 'Urgent', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
};

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

const CATEGORY_TO_QUEUE = {
  'Technical Support': 'support',
  'Partnership': 'partnerships',
  'Donation': 'finance',
  'General Enquiry': 'general',
  'Feedback': 'general',
  'Media / Press': 'media',
  'Membership': 'support',
  'Other': 'general',
};

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

export default function InquiryCard({ inquiry, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(inquiry.response || '');
  const [replyNote, setReplyNote] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [sentiment, setSentiment] = useState(inquiry.sentiment || null);
  const [category, setCategory] = useState(inquiry.category || null);
  const [queue, setQueue] = useState(inquiry.queue || null);
  const [aiNotes, setAiNotes] = useState(inquiry.ai_classification_notes || null);

  const status = STATUS_CONFIG[inquiry.status] || STATUS_CONFIG.new;

  const handleExpand = async () => {
    const opening = !expanded;
    setExpanded(opening);
    if (opening && !sentiment) analyzeSentiment();
    if (opening && !category) reclassify();
  };

  const reclassify = async () => {
    setReclassifying(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are classifying support inquiries for SoulBridge Foundation, a blockchain-based digital village platform built on XRPL.

Classify this inquiry into exactly one of these categories:
- Technical Support: bugs, wallet issues, login problems, app errors, DID/XRPL technical questions
- Partnership: business collaborations, integrations, joint ventures, B2B
- Donation: financial contributions, grants, funding offers
- General Enquiry: general questions about the platform or foundation
- Feedback: suggestions, compliments, complaints about the platform
- Media / Press: journalists, interviews, press enquiries, media coverage
- Membership: joining the Village, agent onboarding, community membership
- Other: anything that doesn't fit above

Respond with JSON only.

Subject: ${inquiry.subject}
Message: ${inquiry.message}`,
        response_json_schema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Technical Support', 'Partnership', 'Donation', 'General Enquiry', 'Feedback', 'Media / Press', 'Membership', 'Other'],
            },
            reasoning: { type: 'string' },
          },
        },
      });
      if (result?.category) {
        const newCategory = result.category;
        const newQueue = CATEGORY_TO_QUEUE[newCategory] || 'general';
        const notes = result.reasoning || '';
        setCategory(newCategory);
        setQueue(newQueue);
        setAiNotes(notes);
        await base44.entities.Inquiry.update(inquiry.id, {
          category: newCategory,
          queue: newQueue,
          ai_classification_notes: notes,
        });
        toast.success(`Classified as: ${newCategory}`);
        onUpdate?.();
      }
    } catch {
      toast.error('Classification failed');
    }
    setReclassifying(false);
  };

  const analyzeSentiment = async () => {
    setAnalyzingSentiment(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the sentiment of this support inquiry and classify it as one of: positive, neutral, negative, urgent.
Urgent means the person needs immediate help or is in distress.
Respond with JSON only.

Subject: ${inquiry.subject}
Message: ${inquiry.message}`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] },
            reason: { type: 'string' },
          },
        },
      });
      const s = result?.sentiment || 'neutral';
      setSentiment(s);
      await base44.entities.Inquiry.update(inquiry.id, { sentiment: s });
    } catch {
      setSentiment('neutral');
    }
    setAnalyzingSentiment(false);
  };

  const generateAIDraft = async () => {
    setGeneratingDraft(true);
    try {
      const categoryContext = category ? `This is a ${category} inquiry.` : '';
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a support agent for SoulBridge Foundation, a blockchain-based digital village platform built on XRPL.
${categoryContext}
Write a professional, warm, and helpful email reply to this inquiry.
Keep it concise (3-5 sentences). Use plain text only, no markdown.
Sign off as: Nathan Green, SoulBridge Foundation.

Subject: ${inquiry.subject}
Message: ${inquiry.message}`,
      });
      setResponse(result || '');
      toast.success('AI draft generated!');
    } catch {
      toast.error('Failed to generate draft');
    }
    setGeneratingDraft(false);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    const updateData = { status: newStatus };
    if (newStatus === 'responded' && response.trim()) updateData.response = response;
    await base44.entities.Inquiry.update(inquiry.id, updateData);
    setSaving(false);
    onUpdate?.();
  };

  const handleSaveResponse = async () => {
    setSaving(true);
    await base44.entities.Inquiry.update(inquiry.id, { response, status: 'responded' });
    setSaving(false);
    toast.success('Response saved and marked as responded');
    onUpdate?.();
  };

  const handleSendEmail = () => {
    const plainText = response.replace(/<[^>]+>/g, '').trim();
    const subject = encodeURIComponent(`Re: ${inquiry.subject || 'Your enquiry'}`);
    const bodyText = plainText
      ? plainText + '\n\n---\nNathan Green\nSoulBridge Foundation\nsupport@soulbridge-foundation.org'
      : `Hi,\n\nThank you for reaching out to SoulBridge Foundation.\n\n---\nNathan Green\nSoulBridge Foundation\nsupport@soulbridge-foundation.org`;
    window.location.href = `mailto:${inquiry.sender_email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
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

  const sentimentInfo = sentiment ? SENTIMENT_CONFIG[sentiment] : null;

  return (
    <Card className={`bg-slate-900/60 border-slate-700/50 hover:border-slate-600/70 transition-colors ${sentiment === 'urgent' ? 'border-orange-500/40' : ''}`}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
              <span className="text-slate-500 text-xs">{moment(inquiry.created_date).fromNow()}</span>
              {inquiry.source && <span className="text-slate-600 text-[10px]">via {inquiry.source}</span>}
              {/* Category Badge */}
              {category && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']}`}>
                  <Tag className="w-2.5 h-2.5" />
                  {category}
                </span>
              )}
              {queue && QUEUE_LABELS[queue] && (
                <span className="text-[10px] text-slate-500">{QUEUE_LABELS[queue]}</span>
              )}
              {inquiry.reply_note && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">Reply Logged</Badge>
              )}
              {/* Sentiment */}
              {analyzingSentiment ? (
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analyzing...
                </span>
              ) : sentimentInfo ? (
                <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${sentimentInfo.bg} ${sentimentInfo.color}`}>
                  <sentimentInfo.icon className="w-2.5 h-2.5" />
                  {sentimentInfo.label}
                </span>
              ) : null}
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
          <Button variant="ghost" size="sm" onClick={handleExpand} className="text-slate-400 hover:text-white flex-shrink-0">
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

            {/* AI Classification Panel */}
            <div className="flex items-center gap-2 flex-wrap bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2">
              <Tag className="w-3 h-3 text-slate-500 flex-shrink-0" />
              {reclassifying ? (
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Classifying...
                </span>
              ) : category ? (
                <>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS['Other']}`}>{category}</span>
                  {queue && <span className="text-slate-400 text-[11px]">{QUEUE_LABELS[queue]}</span>}
                  {aiNotes && <span className="text-slate-600 text-[10px] italic truncate flex-1">{aiNotes}</span>}
                </>
              ) : (
                <span className="text-slate-600 text-xs">Not yet classified</span>
              )}
              <button
                onClick={reclassify}
                disabled={reclassifying}
                className="ml-auto text-slate-500 hover:text-purple-400 transition-colors"
                title="Re-classify with AI"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Response Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-500 font-semibold uppercase">Response Draft</p>
                <Button
                  onClick={generateAIDraft}
                  size="sm"
                  disabled={generatingDraft}
                  className="bg-purple-700/30 hover:bg-purple-700/50 text-purple-300 border border-purple-500/30 gap-1.5 text-xs h-7"
                >
                  {generatingDraft
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                    : <><Sparkles className="w-3 h-3" /> AI Draft</>}
                </Button>
              </div>
              <div className="quill-dark rounded-lg overflow-hidden border border-slate-700">
                <style>{`
                  .quill-dark .ql-toolbar { background: #1e293b; border-color: #334155 !important; }
                  .quill-dark .ql-toolbar button, .quill-dark .ql-toolbar .ql-picker-label { color: #94a3b8; }
                  .quill-dark .ql-toolbar button:hover, .quill-dark .ql-toolbar button.ql-active { color: #c084fc; }
                  .quill-dark .ql-toolbar .ql-stroke { stroke: #94a3b8; }
                  .quill-dark .ql-toolbar button:hover .ql-stroke, .quill-dark .ql-toolbar button.ql-active .ql-stroke { stroke: #c084fc; }
                  .quill-dark .ql-toolbar .ql-fill { fill: #94a3b8; }
                  .quill-dark .ql-container { background: #0f172a; border-color: transparent !important; min-height: 100px; }
                  .quill-dark .ql-editor { color: #e2e8f0; font-size: 0.875rem; min-height: 100px; }
                  .quill-dark .ql-editor.ql-blank::before { color: #475569; font-style: normal; }
                `}</style>
                <ReactQuill
                  theme="snow"
                  value={response}
                  onChange={setResponse}
                  modules={quillModules}
                  placeholder="Write your response here, or use AI Draft above..."
                />
              </div>
            </div>

            {/* Log Their Reply */}
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
              <textarea
                value={replyNote}
                onChange={e => setReplyNote(e.target.value)}
                placeholder={inquiry.reply_note ? 'Update their reply note...' : 'Paste or type what they replied here...'}
                rows={3}
                className="w-full bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-600 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                disabled={saving || !response.replace(/<[^>]+>/g, '').trim()}
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