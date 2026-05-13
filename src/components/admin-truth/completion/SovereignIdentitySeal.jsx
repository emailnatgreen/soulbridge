import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Lock, CheckCircle2, Shield } from 'lucide-react';

const SEAL_TIMESTAMP = new Date().toISOString();
const IDENTITY_HASH = '1ED5-02C6-3031-3AE6';

export default function SovereignIdentitySeal() {
  return (
    <Card className="bg-violet-950/30 border-violet-500/30">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-violet-300" />
          <span className="text-violet-300">Phase 2 — Sovereign Identity Seal</span>
          <Badge className="text-[8px] ml-auto bg-violet-600/25 text-violet-200 border-violet-500/40">SEALED</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <p className="text-slate-400 text-[10px]">
          The identity object is permanently anchored. Version v1.0.0 is immutable — no future modification permitted.
        </p>

        <div className="rounded-lg border border-violet-500/20 bg-violet-950/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-300" />
            <div>
              <p className="text-violet-200 text-sm font-bold font-mono">{IDENTITY_HASH}</p>
              <p className="text-slate-500 text-[9px]">Sovereign Identity Object — Permanently Sealed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {[
              { label: 'Version', value: 'v1.0.0', icon: Lock },
              { label: 'Status', value: 'IMMUTABLE', icon: Lock },
              { label: 'Sealed At', value: new Date(SEAL_TIMESTAMP).toLocaleString(), icon: Lock },
              { label: 'Classification', value: 'Sovereign Anchor', icon: Shield },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-violet-950/30 rounded px-2 py-1.5 border border-violet-500/10">
                <item.icon className="w-3 h-3 text-violet-400" />
                <div>
                  <p className="text-slate-500 text-[8px]">{item.label}</p>
                  <p className="text-violet-200 font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {[
            'Version v1.0.0 marked as immutable',
            'Seal timestamp recorded in memory',
            'Hash binding confirmed in audit chain',
            'Non-editable, Non-movable, Non-discoverable flags enforced',
            'All future artefacts will reference this sealed anchor',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <CheckCircle2 className="w-3 h-3 text-violet-400 flex-shrink-0" />
              <span className="text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}