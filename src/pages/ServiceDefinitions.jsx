import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Server, Zap, Clock, Shield, Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  deprecated: 'bg-red-500/20 text-red-300 border-red-500/30',
  disabled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TYPE_COLORS = {
  one_shot: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  streaming: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  toggle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  metered: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  scheduled: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

function ServiceCard({ svc }) {
  const limits = svc.usage_limits || {};
  const runtime = svc.runtime_behavior || {};
  const pricing = svc.pricing_model || {};

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white text-sm font-semibold truncate">{svc.name}</h3>
            <p className="text-white/30 text-[10px] font-mono">{svc.service_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[svc.status] || STATUS_COLORS.draft}`}>
            {svc.status}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${TYPE_COLORS[svc.service_type] || TYPE_COLORS.one_shot}`}>
            {svc.service_type}
          </span>
        </div>
      </div>

      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{svc.description}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
          <Shield className="w-2.5 h-2.5 inline mr-1" />{svc.widget_nft_id}
        </span>
        {runtime.handler_function && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
            <Zap className="w-2.5 h-2.5 inline mr-1" />{runtime.handler_function}
          </span>
        )}
        {runtime.timeout_ms && (
          <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">
            <Clock className="w-2.5 h-2.5 inline mr-1" />{runtime.timeout_ms}ms
          </span>
        )}
        {pricing.model_type && (
          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {pricing.model_type}
          </span>
        )}
      </div>

      {(limits.max_invocations_per_day || limits.cooldown_seconds > 0 || limits.requires_minimum_honor > 0) && (
        <div className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 flex flex-wrap gap-3">
          {limits.max_invocations_per_day > 0 && (
            <div className="text-[10px] text-white/40"><span className="text-white/60 font-medium">{limits.max_invocations_per_day}</span>/day</div>
          )}
          {limits.max_invocations_per_hour > 0 && (
            <div className="text-[10px] text-white/40"><span className="text-white/60 font-medium">{limits.max_invocations_per_hour}</span>/hr</div>
          )}
          {limits.cooldown_seconds > 0 && (
            <div className="text-[10px] text-white/40"><span className="text-white/60 font-medium">{limits.cooldown_seconds}s</span> cooldown</div>
          )}
          {limits.requires_minimum_honor > 0 && (
            <div className="text-[10px] text-amber-300"><Shield className="w-2.5 h-2.5 inline mr-0.5" /> Honor ≥ {limits.requires_minimum_honor}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServiceDefinitions() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['service-definitions'],
    queryFn: () => base44.entities.ServiceDefinition.list('-created_date', 50),
  });

  const active = services.filter(s => s.status === 'active');
  const other = services.filter(s => s.status !== 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/service-usage-logs" className="text-white/40 hover:text-white transition">
            <Activity className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Server className="w-5 h-5 text-purple-400" /> Service Definitions</h1>
            <p className="text-white/40 text-xs">Service Engine registry — {services.length} definitions</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-white/40 text-sm">Loading services…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <div>
                <p className="text-emerald-300/60 text-[10px] uppercase tracking-widest mb-2">Active ({active.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {active.map(s => <ServiceCard key={s.id} svc={s} />)}
                </div>
              </div>
            )}
            {other.length > 0 && (
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Other ({other.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {other.map(s => <ServiceCard key={s.id} svc={s} />)}
                </div>
              </div>
            )}
            {services.length === 0 && (
              <div className="text-center py-12">
                <Server className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No service definitions registered yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}