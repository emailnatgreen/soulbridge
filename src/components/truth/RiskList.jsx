import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function RiskList({ risks }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
        <span className="text-emerald-400 text-xs">✓ No risks identified</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {risks.map((r, i) => (
        <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-[9px] ${r.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                {r.severity}
              </Badge>
              {r.affected_claims?.map(c => (
                <Badge key={c} className="text-[9px] bg-white/5 text-white/40 border-white/10">{c}</Badge>
              ))}
            </div>
            <p className="text-white/60 text-xs">{r.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}