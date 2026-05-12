import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function ClaimCard({ claim, score, evidence }) {
  const v = score?.veracity_score ?? 0;
  const conf = score?.confidence || 'unknown';
  const pct = Math.round(v * 100);

  const Icon = v >= 0.8 ? CheckCircle : v >= 0.6 ? AlertTriangle : XCircle;
  const color = v >= 0.8 ? 'text-emerald-400' : v >= 0.6 ? 'text-amber-400' : 'text-red-400';
  const bg = v >= 0.8 ? 'border-emerald-500/20' : v >= 0.6 ? 'border-amber-500/20' : 'border-red-500/20';

  return (
    <div className={`rounded-lg border ${bg} bg-white/[0.02] p-3 space-y-2`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs leading-relaxed">{claim.text}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold font-mono ${color}`}>{pct}%</p>
          <Badge className="text-[8px] bg-white/5 text-white/40 border-white/10">{conf}</Badge>
        </div>
      </div>
      {evidence && evidence.sources?.length > 0 && (
        <div className="pl-6">
          <p className="text-white/30 text-[10px] mb-1">Sources:</p>
          <div className="flex flex-wrap gap-1">
            {evidence.sources.map((s, i) => (
              <Badge key={i} className="text-[9px] bg-cyan-500/10 text-cyan-300/60 border-cyan-500/20">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {score?.notes && (
        <p className="text-white/30 text-[10px] pl-6 leading-relaxed">{score.notes}</p>
      )}
    </div>
  );
}