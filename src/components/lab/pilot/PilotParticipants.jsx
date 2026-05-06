import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, UserPlus, CheckCircle2, Clock, Activity, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PSTATUS = {
  invited: { label: 'Invited', icon: Mail, color: 'text-amber-400' },
  accepted: { label: 'Accepted', icon: Clock, color: 'text-blue-400' },
  active: { label: 'Active', icon: Activity, color: 'text-emerald-400' },
  inactive: { label: 'Inactive', icon: Clock, color: 'text-slate-500' },
};

function StatBadge({ label, count, color }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30`}>
      <span className={`text-lg font-bold ${color}`}>{count}</span>
      <span className="text-[10px] text-slate-500 uppercase">{label}</span>
    </div>
  );
}

export default function PilotParticipants({ participants }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', email: '', participant_type: 'external_tester' });
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => base44.entities.PilotReadiness.create({
      record_type: 'participant', ...form, participant_status: 'invited',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-readiness'] }); setAdding(false); setForm({ title: '', email: '', participant_type: 'external_tester' }); },
  });

  const enrolled = participants.length;
  const pending = participants.filter(p => p.participant_status === 'invited').length;
  const active = participants.filter(p => p.participant_status === 'active').length;
  const totalFeedback = participants.reduce((s, p) => s + (p.feedback_count || 0), 0);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-semibold">Pilot Participants</h3>
        </div>
        <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300"
          onClick={() => setAdding(!adding)}>
          <UserPlus className="w-4 h-4 mr-1" />Add
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBadge label="Enrolled" count={enrolled} color="text-white" />
        <StatBadge label="Pending" count={pending} color="text-amber-400" />
        <StatBadge label="Active" count={active} color="text-emerald-400" />
        <StatBadge label="Feedback" count={totalFeedback} color="text-blue-400" />
      </div>

      {adding && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
          <Input placeholder="Name..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white" />
          <Input placeholder="Email..." value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white" />
          <Select value={form.participant_type} onValueChange={v => setForm(f => ({ ...f, participant_type: v }))}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="external_tester">External Tester</SelectItem>
              <SelectItem value="internal_agent">Internal Agent</SelectItem>
              <SelectItem value="governor">Governor</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-slate-400">Cancel</Button>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.title}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {addMutation.isPending ? 'Adding...' : 'Invite'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {participants.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-3">No participants yet. Add the first tester.</p>
        ) : participants.map(p => {
          const ps = PSTATUS[p.participant_status || 'invited'];
          const Icon = ps.icon;
          return (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/20">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${ps.color}`} />
                <div>
                  <span className="text-sm text-white">{p.title || 'Unknown'}</span>
                  {p.email && <span className="text-xs text-slate-500 ml-2">{p.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                  {p.participant_type?.replace('_', ' ')}
                </Badge>
                {(p.verifications_completed || 0) > 0 && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />{p.verifications_completed}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}