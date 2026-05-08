import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';

export default function ExperimentSnapshotButton() {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const biasReports = await base44.entities.BiasReport.list('-created_date', 5);
      const tripwireEvents = await base44.entities.TripwireEvent.list('-created_date', 5);

      const snapshot = {
        agent_id: 'experimental-lab',
        type: 'observation',
        content: `Heptagon Experimental Snapshot — ${now}. ` +
          `Production state archived before experimental modifications. ` +
          `Bias reports: ${biasReports.length} total. ` +
          `Tripwire events: ${tripwireEvents.length} total. ` +
          `Leaves cloned: Leaf 1 (Bias Detection), Leaf 6 (100 Prisoner). ` +
          `Experimental modules: Honour Scoring, RLUSD Payments, Trustlines, Chrome Skills.`,
        keywords: ['prototype_archive', 'heptagon', 'experimental', 'snapshot'],
        importance: 9,
        context: JSON.stringify({
          label: `Heptagon Pre-Experiment Snapshot`,
          version: '1.0.0',
          leaves_cloned: 2,
          timestamp: now,
          bias_report_count: biasReports.length,
          tripwire_event_count: tripwireEvents.length,
          experimental_modules: ['honour_scoring', 'rlusd_payments', 'trustlines', 'chrome_skills'],
        }),
        related_entity_type: 'ExperimentalLab',
      };

      return base44.entities.Memory.create(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototype-archives'] });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || done}
      className={`gap-2 text-sm ${done ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
    >
      {mutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Camera className="w-4 h-4" />
      )}
      {mutation.isPending ? 'Archiving…' : done ? 'Archived ✓' : 'Archive Snapshot'}
    </Button>
  );
}