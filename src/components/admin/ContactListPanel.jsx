import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UserPlus, Mail, Trash2, Send, Loader2, Users, Search,
  CheckCircle, X, Zap, BookUser
} from 'lucide-react';
import { toast } from 'sonner';

function AddContactDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', organisation: '', tags: '', notes: '', is_subscriber: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    await base44.entities.Contact.create({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    toast.success('Contact saved');
    setSaving(false);
    onSaved();
    onClose();
    setForm({ name: '', email: '', organisation: '', tags: '', notes: '', is_subscriber: false });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" /> Add Contact
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <Input placeholder="Full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
          <Input placeholder="Email address *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
          <Input placeholder="Organisation (optional)" value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
          <Input placeholder="Tags (comma separated: partner, press)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
          <Textarea placeholder="Internal notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_subscriber} onChange={e => setForm(f => ({ ...f, is_subscriber: e.target.checked }))}
              className="rounded" />
            <span className="text-slate-300 text-sm">This contact is a digest subscriber</span>
          </label>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Add Contact'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkEmailDialog({ open, onClose, contacts }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message required');
      return;
    }
    if (contacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }
    setSending(true);
    const results = [];
    for (const contact of contacts) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'SoulBridge Foundation',
          to: contact.email,
          subject: subject.trim(),
          body: `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<p style="color:#1f2937;font-size:15px">Dear ${contact.name},</p>
<p style="color:#1f2937;font-size:14px;white-space:pre-wrap">${body.trim()}</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
<p style="color:#6b7280;font-size:12px">Nathan Green<br/>SoulBridge Foundation<br/>support@soulbridge-foundation.org</p>
</div>`,
        });
        await base44.entities.Contact.update(contact.id, { last_emailed: new Date().toISOString() });
        results.push({ email: contact.email, ok: true });
      } catch (e) {
        results.push({ email: contact.email, ok: false });
      }
    }
    setSent(results);
    setSending(false);
    const ok = results.filter(r => r.ok).length;
    toast.success(`Sent to ${ok}/${results.length} contacts`);
  };

  const reset = () => { setSubject(''); setBody(''); setSent([]); onClose(); };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Send to {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        {sent.length > 0 ? (
          <div className="space-y-2 mt-2">
            <p className="text-slate-300 text-sm font-semibold">Send Results</p>
            {sent.map(r => (
              <div key={r.email} className="flex items-center gap-2 text-xs">
                {r.ok ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                <span className={r.ok ? 'text-green-300' : 'text-red-300'}>{r.email}</span>
              </div>
            ))}
            <Button onClick={reset} className="w-full mt-3 bg-slate-700 text-white hover:bg-slate-600">Done</Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {contacts.map(c => (
                <Badge key={c.id} className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">{c.name}</Badge>
              ))}
            </div>
            <Input placeholder="Subject *" value={subject} onChange={e => setSubject(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
            <Textarea placeholder="Message... (use {name} for personalisation)" value={body} onChange={e => setBody(e.target.value)}
              rows={6} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600" />
            <Button onClick={handleSend} disabled={sending} className="w-full bg-amber-600 hover:bg-amber-500 text-white gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : `Send Email to ${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ContactListPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('all'); // all | subscribers | non_subscribers
  const [selected, setSelected] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date', 500),
    refetchInterval: 60000,
  });

  const filtered = contacts.filter(c => {
    const matchSearch = !search.trim() ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.organisation?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchSub = filterSub === 'all' ? true :
      filterSub === 'subscribers' ? c.is_subscriber :
      !c.is_subscriber;
    return matchSearch && matchSub;
  });

  const selectedContacts = filtered.filter(c => selected.has(c.id));

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Contact.delete(id);
    qc.invalidateQueries({ queryKey: ['contacts'] });
    toast.success('Contact removed');
  };

  const subsCount = contacts.filter(c => c.is_subscriber).length;
  const nonSubsCount = contacts.filter(c => !c.is_subscriber).length;

  return (
    <div>
      {/* Stats Row */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <BookUser className="w-4 h-4 text-purple-400" />
          <span className="text-white font-bold">{contacts.length}</span>
          <span className="text-slate-400 text-xs">Total</span>
        </div>
        <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-bold">{subsCount}</span>
          <span className="text-slate-400 text-xs">Subscribers</span>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-white font-bold">{nonSubsCount}</span>
          <span className="text-slate-400 text-xs">Non-subscribers</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'subscribers', label: '✅ Subscribers' },
            { key: 'non_subscribers', label: '⬜ Non-subs' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterSub(opt.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap border ${
                filterSub === opt.key
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'text-slate-500 border-slate-700/50 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs flex-shrink-0">
          <UserPlus className="w-3.5 h-3.5" /> Add Contact
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 mb-3">
          <span className="text-amber-300 text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" onClick={() => setBulkOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs ml-auto">
            <Zap className="w-3.5 h-3.5" /> Email Selected
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookUser className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No contacts yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          <div className="flex items-center gap-2 px-1 pb-1 border-b border-slate-800">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll} className="rounded" />
            <span className="text-slate-500 text-xs">Select all ({filtered.length})</span>
          </div>
          {filtered.map(contact => (
            <div key={contact.id}
              className={`bg-slate-900/60 border rounded-xl p-3 sm:p-4 flex items-start gap-3 transition ${
                selected.has(contact.id) ? 'border-purple-500/50 bg-purple-900/10' : 'border-slate-700/50'
              }`}>
              <input type="checkbox" checked={selected.has(contact.id)}
                onChange={() => toggleSelect(contact.id)} className="rounded mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{contact.name}</span>
                  {contact.is_subscriber && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] px-1.5">Subscriber</Badge>
                  )}
                  {contact.tags?.map(tag => (
                    <Badge key={tag} className="bg-slate-700 text-slate-400 border-slate-600 text-[9px] px-1.5">{tag}</Badge>
                  ))}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">{contact.email}</p>
                {contact.organisation && <p className="text-slate-500 text-[11px]">{contact.organisation}</p>}
                {contact.notes && <p className="text-slate-600 text-[11px] mt-1 italic truncate">{contact.notes}</p>}
                {contact.last_emailed && (
                  <p className="text-slate-700 text-[10px] mt-1">Last emailed: {contact.last_emailed?.slice(0, 10)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setBulkOpen(true); setSelected(new Set([contact.id])); }}
                  className="p-1.5 text-slate-500 hover:text-purple-400 transition"
                  title="Email this contact"
                >
                  <Mail className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 transition"
                  title="Delete contact"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddContactDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['contacts'] })} />
      <BulkEmailDialog open={bulkOpen} onClose={() => { setBulkOpen(false); setSelected(new Set()); }} contacts={selectedContacts} />
    </div>
  );
}