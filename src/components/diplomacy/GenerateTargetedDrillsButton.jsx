import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function GenerateTargetedDrillsButton({ agentId }) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateTargetedDrills', { agent_id: agentId });

      if (data.error) throw new Error(data.error);

      qc.invalidateQueries({ queryKey: ['ghost-reviews'] });
      qc.invalidateQueries({ queryKey: ['escalation-chains'] });

      let msg = `${data.drills_created} targeted drills generated`;
      if (data.escalation_chain_created) msg += ' + Escalation Chain created (de-escalation focus)';
      toast.success(msg);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={generate}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Target className="w-3 h-3 mr-1" />}
      {loading ? 'Generating...' : 'Targeted Drills'}
    </Button>
  );
}