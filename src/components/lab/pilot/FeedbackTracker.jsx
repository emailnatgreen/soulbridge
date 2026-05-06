import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Plus, AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_MAP = {
  open: { label: 'Open', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  in_progress: { label: 'In Progress', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const PRIORITY_COLOR = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function FeedbackTracker({ feedback }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'bug', priority: 'medium' });
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => base44.entities.PilotReadiness.create({
      record_type: 'feedback', ...form, status: 'open',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-readiness'] }); setAdding(false); setForm({ title: '', description: '', category: 'bug', priority: 'medium' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PilotReadiness.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilot-readiness'] }),
  });

  const open = feedback.filter(f => f.status === 'open').length;
  const inProgress = feedback.filter(f => f.status === 'in_progress').length;
  const resolved = feedback.filter(f => f.status === 'resolved').length;
  const blockers = feedback.filter(f => f.priority === 'critical' && f.status !== 'resolved');

  return (
    <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-semibold">Feedback Loop</h3>
        </div>
        <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300"
          onClick={() => setAdding(!adding)}>
          <Plus className="w-4 h-4 mr-1" />New
        </Button>
      </div>

      <div className="flex gap-4 mb-4 text-xs">
        <span className="text-red-400">{open} Open</span>
        <span className="text-amber-400">{inProgress} In Progress</span>
        <span className="text-emerald-400">{resolved} Resolved</span>
      </div>

      {blockers.length > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-xs text-red-400 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Critical Blockers
          </div>
          {blockers.map(b => (
            <div key={b.id} className="text-xs text-red-300">{b.title}</div>
          ))}
        </div>
      )}

      {adding && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
          <Input placeholder="Issue title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white" />
          <Textarea placeholder="Details..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white h-16" />
          <div className="flex gap-2">
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="ux">UX</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="blocker">Blocker</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-slate-400">Cancel</Button>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.title}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {addMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {feedback.filter(f => f.status !== 'resolved').length === 0 && !adding ? (
          <p className="text-slate-500 text-sm text-center py-3">No open feedback. Submit the first report.</p>
        ) : feedback.filter(f => f.status !== 'resolved').map(f => {
          const s = STATUS_MAP[f.status || 'open'];
          const Icon = s.icon;
          return (
            <div key={f.id} className={`flex items-start justify-between py-2 px-3 rounded-lg ${s.bg} border border-slate-700/20`}>
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Icon className={`w-4 h-4 mt-0.5 ${s.color}`} />
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{f.title}</div>
                  {f.description && <div className="text-xs text-slate-400 truncate">{f.description}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Badge className={`${PRIORITY_COLOR[f.priority || 'medium']} border text-[10px]`}>{f.priority}</Badge>
                {f.status === 'open' && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-400"
                    onClick={() => updateMutation.mutate({ id: f.id, status: 'in_progress' })}>Fix</Button>
                )}
                {f.status === 'in_progress' && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400"
                    onClick={() => updateMutation.mutate({ id: f.id, status: 'resolved' })}>Done</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}