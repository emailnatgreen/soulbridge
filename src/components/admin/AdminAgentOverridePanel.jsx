import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Save, Loader2, ShieldAlert, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/adminAuditLog';

const ROLES = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];
const STATUSES = ['active', 'dormant', 'suspended', 'probation'];

export default function AdminAgentOverridePanel({ agent, onUpdated }) {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState({});
  const [reason, setReason] = useState('');

  const hasEdits = Object.keys(edits).length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Reason is required for admin overrides');
      const oldValues = {};
      Object.keys(edits).forEach(k => { oldValues[k] = agent[k]; });

      await base44.entities.Agent.update(agent.id, edits);

      await logAdminAction({
        action: 'agent_profile_override',
        target_entity: 'Agent',
        target_id: agent.id,
        details: { agent_name: agent.name, changes: edits, old_values: oldValues, reason: reason.trim() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent']);
      queryClient.invalidateQueries(['all-agents-selector']);
      toast.success('Agent profile updated (logged to audit)');
      setEdits({});
      setReason('');
      onUpdated?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const setField = (field, value) => {
    setEdits(prev => {
      const next = { ...prev, [field]: value };
      if (value === agent[field]) delete next[field];
      return next;
    });
  };

  return (
    <Card className="bg-amber-500/5 border-amber-500/20 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Admin Override Panel
          <Badge className="bg-amber-500/20 text-amber-200 text-[10px]">Law 2: Honour — All changes logged</Badge>
        </CardTitle>
        {agent.classic_address && (
          <div className="flex items-center gap-1.5 mt-1">
            <Fingerprint className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-white/40 font-mono">
              {agent.classic_address.slice(0, 8)}...{agent.classic_address.slice(-6)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Name</label>
            <Input
              value={edits.name ?? agent.name ?? ''}
              onChange={e => setField('name', e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Role</label>
            <Select value={edits.role ?? agent.role ?? 'citizen'} onValueChange={v => setField('role', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Status</label>
            <Select value={edits.status ?? agent.status ?? 'active'} onValueChange={v => setField('status', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Honor Score</label>
            <Input
              type="number"
              value={edits.honor_score ?? agent.honor_score ?? 100}
              onChange={e => setField('honor_score', parseInt(e.target.value) || 0)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Purpose</label>
            <Input
              value={edits.purpose ?? agent.purpose ?? ''}
              onChange={e => setField('purpose', e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Tagline</label>
            <Input
              value={edits.tagline ?? agent.tagline ?? ''}
              onChange={e => setField('tagline', e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
          </div>
        </div>

        {hasEdits && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10px] text-amber-400/60">
              <ShieldAlert className="w-3 h-3" />
              Admin override requires a reason (logged to AutomationLog)
            </div>
            <Input
              placeholder="Reason for this override..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !reason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-xs"
            >
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              Save Override & Log
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}