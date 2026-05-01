import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Settings, ArrowRight } from 'lucide-react';

const STAGES = [
  { n: 1, title: 'Creation', desc: 'A service is created by an authorised actor with the required permissions and honour level. The Governance Engine validates can_create_services permission and checks honour threshold rules before allowing creation.', entity: 'ServiceDefinition', status: 'draft' },
  { n: 2, title: 'Configuration', desc: 'The service owner configures pricing (via PaymentDefinition), treasury splits, metadata, widget gate, and agent behaviours. All configurations are validated by governance rules — pricing bounds, royalty minimums, and metadata version compliance.', entity: 'PaymentDefinition', status: 'draft' },
  { n: 3, title: 'Widget Gating', desc: 'Each service is gated by a Widget NFT (widget_id). Users must own the corresponding NFT to invoke the service. This creates a governed access control layer where NFT minting is itself governance-controlled.', entity: 'Widget', status: 'draft → active' },
  { n: 4, title: 'Publishing', desc: 'The service status transitions to active and becomes discoverable in the ecosystem. Publishing may involve DIDit marketplace integration, storefront listing, or direct agent access.', entity: 'ServiceDefinition', status: 'active' },
  { n: 5, title: 'Revenue Generation', desc: 'Services generate revenue through the configured pricing model — flat fees, per-use billing, per-minute metering, streaming micro-payments, or subscription. Revenue flows directly into the wallet that owns the service.', entity: 'PaymentUsageLog', status: 'active' },
  { n: 6, title: 'Monitoring', desc: 'ServiceUsageLog tracks every invocation — user DID, duration, cost, status, and error details. The Kinetic Grid integrates service activity into Village energy metrics.', entity: 'ServiceUsageLog', status: 'active' },
  { n: 7, title: 'Evolution', desc: 'Services may be updated (new version), paused (temporarily unavailable), or deprecated through governed processes requiring can_deprecate_services permission.', entity: 'ServiceDefinition', status: 'paused → deprecated' },
];

export default function BizServiceLifecycle() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">3</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Service Lifecycle</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 3 · From Creation to Revenue</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            Every service in SoulBridge follows a governed lifecycle from creation through revenue generation 
            to eventual evolution or deprecation. At each stage, the Governance Engine enforces permissions, 
            honour requirements, and rule compliance — ensuring no service can bypass constitutional safeguards.
          </p>
        </div>

        {/* Execution Models */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Service Execution Models</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { model: 'one_shot', desc: 'Single invocation — execute once, return result. Used for discrete operations like DID publication.' },
              { model: 'streaming', desc: 'Continuous execution — charges per stream interval (second/minute/hour/day). Used for real-time monitoring.' },
              { model: 'toggle', desc: 'On/off state — activated and deactivated. Used for persistent feature access like serving status.' },
              { model: 'metered', desc: 'Usage-counted — charges accumulate based on measured consumption. Used for data access and API calls.' },
              { model: 'scheduled', desc: 'Cron-based execution — runs at defined intervals. Used for automated maintenance and reporting.' },
            ].map(m => (
              <div key={m.model} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5">
                <code className="text-amber-300 text-xs font-bold">{m.model}</code>
                <p className="text-white/40 text-[11px] mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Stages */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Lifecycle Stages</h2>
          <div className="space-y-3">
            {STAGES.map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">{s.n}</div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h3 className="text-white/90 font-semibold text-sm">{s.title}</h3>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-amber-300/60">{s.entity}</span>
                      <span className="text-white/30">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">{s.status}</span>
                    </div>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Behaviour */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Runtime Configuration</h2>
          <p className="text-white/60 text-sm">Each ServiceDefinition includes a <code className="text-amber-300 bg-amber-500/10 px-1 rounded">runtime_behavior</code> object controlling execution:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { field: 'handler_function', desc: 'Backend function that executes this service' },
              { field: 'timeout_ms', desc: 'Maximum execution time (default: 30s)' },
              { field: 'retries', desc: 'Auto-retry attempts on failure' },
              { field: 'requires_confirmation', desc: 'User must confirm before execution' },
            ].map(f => (
              <div key={f.field} className="bg-black/20 rounded-lg px-3 py-2">
                <code className="text-amber-300 text-[11px]">{f.field}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}