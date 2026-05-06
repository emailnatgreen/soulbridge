import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Loader2, CheckCircle2 } from 'lucide-react';

const SIM_TYPES = [
  { value: 'node_offline', label: 'Node Offline', severity: 'high', description: 'Simulate a Sentinel node going offline' },
  { value: 'entropy_tampering', label: 'Entropy Tampering', severity: 'critical', description: 'Simulate hash mismatch in entropy round' },
  { value: 'access_violation', label: 'Access Violation', severity: 'critical', description: 'Simulate unauthorized admin attempt' },
  { value: 'threshold_breach', label: 'Treasury Threshold', severity: 'medium', description: 'Simulate treasury limit approach' },
];

export default function TripwireSimulator() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('node_offline');
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef(null);

  const simMutation = useMutation({
    mutationFn: (simType) => base44.functions.invoke('tripwireLockdown', { action: 'simulate', sim_type: simType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripwire-status'] });
      setShowSuccess(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSuccess(false), 4000);
    },
  });

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-amber-400" />
        <span className="text-white text-xs font-medium">Anomaly Simulator</span>
        <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/20">Testing Only</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {SIM_TYPES.map(sim => (
          <button
            key={sim.value}
            onClick={() => setSelected(sim.value)}
            className={`rounded-lg p-2 border text-left transition-all ${
              selected === sim.value
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
            }`}
          >
            <p className="text-white text-[11px] font-medium">{sim.label}</p>
            <p className="text-slate-500 text-[9px] mt-0.5">{sim.description}</p>
            <Badge className={`text-[8px] mt-1 ${
              sim.severity === 'critical' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
              sim.severity === 'high' ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' :
              'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>{sim.severity}</Badge>
          </button>
        ))}
      </div>
      <Button
        size="sm"
        onClick={() => simMutation.mutate(selected)}
        disabled={simMutation.isPending}
        className="bg-amber-600 hover:bg-amber-500 text-xs w-full"
      >
        {simMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
        Inject Simulated Anomaly
      </Button>
      {showSuccess && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          Simulation injected — check alerts above.
        </div>
      )}
    </div>
  );
}