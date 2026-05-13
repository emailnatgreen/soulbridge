import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Database, AlertTriangle, ShieldAlert, Zap, Eye, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryInvestigations, computeMemoryStats } from '@/lib/investigationMemory';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg border border-white/5 px-2.5 py-1.5">
      <Icon className={`w-3 h-3 ${color}`} />
      <div>
        <p className="text-white/60 text-[11px] font-semibold">{value}</p>
        <p className="text-white/20 text-[8px]">{label}</p>
      </div>
    </div>
  );
}

export default function MemoryQueryPanel({ investigations, onSelectInvestigation }) {
  const [query, setQuery] = useState({ text: '', risk_level: 'all', target_type: 'all', has_contradictions: false, has_waivers: false });

  const results = useMemo(() => {
    const q = {};
    if (query.text) q.text = query.text;
    if (query.risk_level !== 'all') q.risk_level = query.risk_level;
    if (query.target_type !== 'all') q.target_type = query.target_type;
    if (query.has_contradictions) q.has_contradictions = true;
    if (query.has_waivers) q.has_waivers = true;
    return queryInvestigations(investigations, q);
  }, [investigations, query]);

  const stats = useMemo(() => computeMemoryStats(investigations), [investigations]);

  const isFiltered = query.text || query.risk_level !== 'all' || query.target_type !== 'all' || query.has_contradictions || query.has_waivers;

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[11px] flex items-center gap-1.5 text-white/50">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="uppercase tracking-wider">Memory Intelligence</span>
          <Badge className="text-[7px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20 ml-auto">
            {stats.total} investigations
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatCard icon={AlertTriangle} label="Total Risks" value={stats.total_risks} color="text-red-400" />
          <StatCard icon={ShieldAlert} label="Contradictions" value={stats.total_contradictions} color="text-amber-400" />
          <StatCard icon={Zap} label="Actions" value={stats.total_actions} color="text-emerald-400" />
          <StatCard icon={Eye} label="Vis. Changes" value={stats.total_visibility_changes} color="text-cyan-400" />
          <StatCard icon={BarChart3} label="Avg Confidence" value={`${stats.avg_confidence}%`} color="text-violet-400" />
          <StatCard icon={AlertTriangle} label="Critical" value={stats.by_severity.critical || 0} color="text-red-500" />
        </div>

        {/* Query Controls */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[140px]">
            <Input
              placeholder="Search investigations..."
              value={query.text}
              onChange={e => setQuery(q => ({ ...q, text: e.target.value }))}
              className="h-7 text-[10px] bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <Select value={query.risk_level} onValueChange={v => setQuery(q => ({ ...q, risk_level: v }))}>
            <SelectTrigger className="w-24 h-7 text-[10px] bg-white/[0.03] border-white/10 text-white/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={query.target_type} onValueChange={v => setQuery(q => ({ ...q, target_type: v }))}>
            <SelectTrigger className="w-24 h-7 text-[10px] bg-white/[0.03] border-white/10 text-white/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="node">Node</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setQuery(q => ({ ...q, has_contradictions: !q.has_contradictions }))}
            className={`px-2 h-7 rounded text-[9px] border ${query.has_contradictions ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-white/[0.03] text-white/30 border-white/10'}`}
          >
            Contradictions
          </button>
          <button
            onClick={() => setQuery(q => ({ ...q, has_waivers: !q.has_waivers }))}
            className={`px-2 h-7 rounded text-[9px] border ${query.has_waivers ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-white/30 border-white/10'}`}
          >
            Waivers
          </button>
        </div>

        {/* Results */}
        {isFiltered && (
          <div className="space-y-1">
            <p className="text-white/20 text-[9px]">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => onSelectInvestigation?.(inv.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/5 hover:border-violet-500/20 hover:bg-violet-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="text-[7px] bg-violet-500/10 text-violet-300 border-violet-500/20">{inv.target_type}</Badge>
                    <p className="text-white/50 text-[10px] truncate flex-1">{inv.question}</p>
                    {inv.metrics?.critical_risks > 0 && (
                      <Badge className="text-[7px] bg-red-500/10 text-red-300 border-red-500/20">{inv.metrics.critical_risks} crit</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}