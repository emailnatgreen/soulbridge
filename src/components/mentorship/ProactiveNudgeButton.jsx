import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Small inline button that dispatches a gentle proactive nudge for a given alert.
 * Used within MentorshipWellbeingAlert cards.
 */
export default function ProactiveNudgeButton({ alert, agentId }) {
  const [state, setState] = useState('idle'); // idle | loading | done

  const dispatch = async () => {
    setState('loading');
    try {
      const res = await base44.functions.invoke('proactiveIntervention', {
        alert_id: alert.id || null,
        agent_id: agentId,
        alert_type: alert.alert_type,
        severity: alert.severity,
        description: alert.description,
        metadata: alert.metadata || {}
      });
      if (res.data?.success) {
        setState('done');
        toast.success(`💙 Gentle nudge sent to ${res.data.agent_name}`);
      } else {
        setState('idle');
        toast.error(res.data?.error || 'Nudge failed');
      }
    } catch (e) {
      setState('idle');
      toast.error('Nudge error: ' + e.message);
    }
  };

  if (state === 'done') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="w-3 h-3" /> Nudge sent
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={dispatch}
      disabled={state === 'loading'}
      className="text-xs text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 h-7 px-2"
    >
      {state === 'loading'
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <Sparkles className="w-3 h-3 mr-1" />}
      {state === 'loading' ? 'Sending…' : 'Gentle Nudge'}
    </Button>
  );
}