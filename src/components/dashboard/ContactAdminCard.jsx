import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Mail, Send, Loader2, CheckCircle } from 'lucide-react';

export default function ContactAdminCard({ userDid, userName, userEmail }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    const senderLabel = userDid ? `DID: ${userDid.slice(0, 20)}…` : userEmail || 'Village Member';
    await base44.functions.invoke('submitInquiry', {
      sender_email: userEmail || 'no-reply@soulbridge.village',
      subject: `[Village Support] ${subject}`,
      message: `From: ${userName || 'Unknown'}\nDID: ${userDid || 'Not linked'}\nEmail: ${userEmail || 'Not available'}\n\n${message}`,
      source: 'universal_dashboard',
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); setSubject(''); setMessage(''); }, 3000);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 p-4 sm:p-5 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">Contact SoulBridge Support</h3>
            <p className="text-white/50 text-xs mt-0.5">Send a message to the admin team from your dashboard</p>
          </div>
        </div>
      </button>
    );
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-center">
        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-green-300 font-medium text-sm">Message sent to SoulBridge admins</p>
        <p className="text-white/40 text-xs mt-1">We'll get back to you shortly</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-medium text-sm">Contact Support</h3>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-xs">Cancel</button>
      </div>
      {userDid && (
        <p className="text-purple-300/60 text-[10px] font-mono truncate">DID: {userDid}</p>
      )}
      <Input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject"
        className="bg-white/5 border-white/15 text-white placeholder:text-slate-600 text-sm h-9"
      />
      <Textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Describe your question or issue..."
        rows={3}
        className="bg-white/5 border-white/15 text-white placeholder:text-slate-600 text-sm resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !message.trim()}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white h-9 text-sm gap-2"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {sending ? 'Sending…' : 'Send to Admin Team'}
      </Button>
    </div>
  );
}