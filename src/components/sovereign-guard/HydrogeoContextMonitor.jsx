import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCcw, Loader2, Eye } from 'lucide-react';

export default function HydrogeoContextMonitor() {
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['hydrogeo-audit'],
    queryFn: async () => {
      const res = await base44.functions.invoke('hydrogeoContextGate', {
        action: 'audit',
        limit: 30,
      });
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  const stats = data?.stats || {};
  const trail = data?.audit_trail || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Hydrogeo Context Gate</h3>
          <Badge className="text-[8px] bg-cyan-500/15 text-cyan-300 border-cyan-500/30">PHASE 1</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-white/40 hover:text-white h-7"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total || 0, color: 'text-white' },
          { label: 'Granted', value: stats.granted || 0, color: 'text-green-400' },
          { label: 'Denied', value: stats.denied || 0, color: 'text-amber-400' },
          { label: 'Blocked', value: stats.blocked || 0, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Trail */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      ) : trail.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-xs">
          No gate activity recorded yet. Context access will appear here.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {trail.map((record, i) => {
            const isGranted = record.content?.includes('GRANTED');
            const isBlocked = record.content?.includes('BLOCKED');
            const isDenied = record.content?.includes('DENIED');
            const isRevoked = record.content?.includes('REVOKED');
            const isExpanded = expanded === i;

            const Icon = isGranted ? CheckCircle2 : isBlocked ? XCircle : isDenied ? AlertTriangle : Shield;
            const iconColor = isGranted ? 'text-green-400' : isBlocked ? 'text-red-400' : isDenied ? 'text-amber-400' : 'text-purple-400';
            const borderColor = isGranted ? 'border-green-500/10' : isBlocked ? 'border-red-500/10' : isDenied ? 'border-amber-500/10' : 'border-purple-500/10';

            // Extract first line as summary
            const summary = (record.content || '').split('\n')[0].replace(/^[✅⚠️🛡️🔒🚫]\s*/, '');

            return (
              <div
                key={record.id}
                className={`rounded-lg border ${borderColor} bg-black/20 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-all`}
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
                  <span className="text-white/60 text-xs flex-1 truncate">{summary}</span>
                  <span className="text-white/20 text-[9px] flex-shrink-0">
                    {new Date(record.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Eye className={`w-3 h-3 ${isExpanded ? 'text-cyan-400' : 'text-white/10'}`} />
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-white/40 text-[10px] whitespace-pre-wrap">{record.content}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(record.keywords || []).map(kw => (
                        <Badge key={kw} className="text-[7px] bg-white/5 text-white/30 border-white/10">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}