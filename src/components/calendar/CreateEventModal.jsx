import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = ['automation', 'project', 'governance', 'news', 'milestone', 'custom'];
const PRIORITIES = ['low', 'normal', 'high', 'critical'];

export default function CreateEventModal({ onClose, onCreated, defaultDate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: defaultDate ? defaultDate.toISOString().slice(0, 16) : '',
    end_date: '',
    category: 'custom',
    priority: 'normal',
    external_url: '',
    all_day: false,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('syncCalendarEvents', {
        action: 'create_event',
        event_data: {
          ...form,
          start_date: new Date(form.start_date).toISOString(),
          end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        },
      });
      onCreated?.(res.data?.event);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <form
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Create Calendar Event</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            required
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Event title *"
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Start *</label>
              <input
                required
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">End</label>
              <input
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <input
            value={form.external_url}
            onChange={e => set('external_url', e.target.value)}
            placeholder="External URL (optional)"
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={e => set('all_day', e.target.checked)}
              className="rounded"
            />
            All-day event
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-400 text-xs">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-violet-700 hover:bg-violet-800 text-white text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}