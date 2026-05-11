import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Lock, ArrowRight } from 'lucide-react';

const PHASES = [
  {
    id: 1,
    name: 'Hydrogeo Context Layer',
    description: 'Persistent, auditable, sincerity-gated agent memory',
    status: 'complete',
    dependencies: [],
    components: ['hydrogeoContextGate', 'assembleAgentContext (upgraded)', 'HydrogeoContextMonitor'],
  },
  {
    id: 2,
    name: 'Reverse-Coding Verification',
    description: 'Agents prove action matches Soul Signature before execution',
    status: 'complete',
    dependencies: [1],
    components: ['soulSignatureVerify', 'SoulSignatureMonitor'],
  },
  {
    id: 3,
    name: '8-Node Contextual Sync',
    description: 'Real-time context sync across all 8 consortium nodes',
    status: 'active',
    dependencies: [1, 2],
    components: ['nodeContextSync', 'NodeContextSyncMonitor'],
  },
  {
    id: 4,
    name: 'Chrome Skill Security Alignment',
    description: 'May 2026 security patches + AP2 protocol compliance',
    status: 'awaiting',
    dependencies: [3],
    components: ['chromeSkillManifest', 'SpindleFirstLayerFilter'],
  },
  {
    id: 5,
    name: 'Agent Payments (AP2 / A2A)',
    description: 'RLUSD agent-to-agent payments with sincerity verification',
    status: 'awaiting',
    dependencies: [2, 4],
    components: ['ap2PaymentEngine', 'sincerityPaymentGate'],
  },
];

const statusConfig = {
  complete: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Complete' },
  active: { icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', label: 'Building' },
  awaiting: { icon: Lock, color: 'text-white/20', bg: 'bg-white/[0.02] border-white/5', label: 'Awaiting' },
};

export default function PhaseTracker() {
  return (
    <div className="space-y-3">
      {PHASES.map((phase, i) => {
        const config = statusConfig[phase.status];
        const Icon = config.icon;

        return (
          <div key={phase.id} className={`rounded-xl border ${config.bg} p-4`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-lg ${phase.status === 'active' ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/30 text-[10px] font-mono">PHASE {phase.id}</span>
                  <Badge className={`text-[8px] ${
                    phase.status === 'complete' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                    phase.status === 'active' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                    'bg-white/5 text-white/20 border-white/10'
                  }`}>
                    {config.label}
                  </Badge>
                  {phase.dependencies.length > 0 && (
                    <span className="text-white/15 text-[8px]">
                      Requires: {phase.dependencies.map(d => `P${d}`).join(' + ')}
                    </span>
                  )}
                </div>

                <h4 className={`text-sm font-semibold ${phase.status === 'awaiting' ? 'text-white/30' : 'text-white'}`}>
                  {phase.name}
                </h4>
                <p className={`text-[10px] mt-0.5 ${phase.status === 'awaiting' ? 'text-white/15' : 'text-white/40'}`}>
                  {phase.description}
                </p>

                {phase.status !== 'awaiting' && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {phase.components.map(c => (
                      <Badge key={c} className="text-[7px] bg-white/5 text-white/30 border-white/10 font-mono">{c}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dependency arrow */}
            {i < PHASES.length - 1 && (
              <div className="flex justify-center mt-2">
                <ArrowRight className="w-3 h-3 text-white/10 rotate-90" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}