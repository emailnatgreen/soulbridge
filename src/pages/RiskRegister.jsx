import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Shield, TrendingDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import FilterBar from '@/components/filters/FilterBar';
import ActivityTimeline from '@/components/audit/ActivityTimeline';

const RISK_FILTERS = [
  { key: 'severity', label: 'Severity', type: 'select', options: ['Critical','High','Medium','Low'] },
  { key: 'status', label: 'Status', type: 'select', options: ['open','mitigated','closed','monitoring'] },
  { key: 'category', label: 'Category', type: 'select', options: ['technical','governance','financial','operational','reputational','compliance'] },
];

const SORT_OPTIONS = [
  { value: 'severity', label: 'Severity (Critical First)' },
  { value: '-created_date', label: 'Newest' },
  { value: 'status', label: 'Status' },
];

const SEV_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SEV_COLORS = {
  Critical: 'bg-red-900/40 text-red-300 border-red-700/40',
  High: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  Medium: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  Low: 'bg-green-900/40 text-green-300 border-green-700/40',
};
const STATUS_COLORS = {
  open: 'bg-red-900/40 text-red-300 border-red-700/40',
  monitoring: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  mitigated: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  closed: 'bg-green-900/40 text-green-300 border-green-700/40',
};

export default function RiskRegister() {
  const queryClient = useQueryClient();
  const [filterValues, setFilterValues] = useState({ search: '', severity: 'all', status: 'all', category: 'all' });
  const [sortBy, setSortBy] = useState('severity');
  const [tab, setTab] = useState('risks');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'Medium', category: 'operational', mitigation_plan: '' });

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risk-register'],
    queryFn: () => base44.entities.RiskRegister.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RiskRegister.create({ ...data, status: 'open' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-register'] });
      setShowCreate(false);
      setForm({ title: '', description: '', severity: 'Medium', category: 'operational', mitigation_plan: '' });
      toast.success('Risk logged!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RiskRegister.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['risk-register'] }),
  });

  const filtered = risks.filter(r => {
    const q = filterValues.search?.toLowerCase();
    if (q && !`${r.title} ${r.description} ${r.category}`.toLowerCase().includes(q)) return false;
    if (filterValues.severity !== 'all' && r.severity !== filterValues.severity) return false;
    if (filterValues.status !== 'all' && r.status !== filterValues.status) return false;
    if (filterValues.category !== 'all' && r.category !== filterValues.category) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'severity') return (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4);
    if (sortBy === '-created_date') return new Date(b.created_date) - new Date(a.created_date);
    return (a.status || '').localeCompare(b.status || '');
  });

  const critical = risks.filter(r => r.severity === 'Critical' && r.status === 'open').length;
  const high = risks.filter(r => r.severity === 'High' && r.status === 'open').length;
  const openCount = risks.filter(r => r.status === 'open').length;

  // Audit timeline
  const timelineEvents = risks.slice(0, 50).map(r => ({
    id: r.id,
    type: r.severity === 'Critical' ? 'error' : r.severity === 'High' ? 'error' : 'info',
    title: `Risk: ${r.title}`,
    description: `Severity: ${r.severity} · Status: ${r.status} · Category: ${r.category || 'N/A'}`,
    actor: 'System',
    timestamp: r.created_date,
    details: r.mitigation_plan,
  }));

  const exportCSV = () => {
    const rows = [['Title','Severity','Status','Category','Description']];
    filtered.forEach(r => rows.push([`"${r.title}"`, r.severity, r.status, r.category || '', `"${r.description || ''}"`]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'risk-register.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/10 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />Risk Register
            </h1>
            <p className="text-slate-400 text-sm mt-1">{risks.length} risks · {openCount} open</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-red-600 hover:bg-red-700 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />Log Risk
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Critical (Open)', val: critical, color: 'text-red-400' },
            { label: 'High (Open)', val: high, color: 'text-orange-400' },
            { label: 'Total Open', val: openCount, color: 'text-amber-400' },
            { label: 'Mitigated', val: risks.filter(r => r.status === 'mitigated').length, color: 'text-green-400' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['risks', 'audit trail'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'risks' && (
          <>
            <FilterBar filters={RISK_FILTERS} values={filterValues} onChange={setFilterValues}
              searchKey="search" searchPlaceholder="Search risks…"
              sortOptions={SORT_OPTIONS} sortValue={sortBy} onSortChange={setSortBy}
              resultCount={filtered.length} />

            {isLoading ? (
              <div className="text-center py-16 text-slate-500">Loading risks…</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(risk => (
                  <Card key={risk.id} className="bg-slate-900/60 border-slate-700/40">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${risk.severity === 'Critical' ? 'bg-red-400' : risk.severity === 'High' ? 'bg-orange-400' : risk.severity === 'Medium' ? 'bg-amber-400' : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-white text-sm font-medium">{risk.title}</span>
                            <Badge className={`text-xs border ${SEV_COLORS[risk.severity] || ''}`}>{risk.severity}</Badge>
                            <Badge className={`text-xs border ${STATUS_COLORS[risk.status] || 'bg-slate-800 text-slate-400 border-slate-700'} capitalize`}>{risk.status}</Badge>
                            {risk.category && <Badge className="text-xs bg-slate-800 border-slate-700 text-slate-400 capitalize">{risk.category}</Badge>}
                          </div>
                          {risk.description && <p className="text-slate-400 text-xs mb-2">{risk.description}</p>}
                          {risk.mitigation_plan && (
                            <p className="text-xs text-slate-500 italic"><span className="text-slate-600">Mitigation:</span> {risk.mitigation_plan}</p>
                          )}
                        </div>
                        {risk.status === 'open' && (
                          <div className="flex gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: risk.id, status: 'mitigated' })}
                              className="h-7 text-xs border-blue-700 text-blue-400 hover:text-blue-300">Mitigate</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: risk.id, status: 'closed' })}
                              className="h-7 text-xs border-green-700 text-green-400 hover:text-green-300">Close</Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'audit trail' && (
          <ActivityTimeline events={timelineEvents} title="Risk Register Audit Trail" maxHeight="600px" />
        )}
      </div>

      {/* Create Risk Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Log New Risk</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Risk title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-20" />
            <div className="flex gap-2">
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2 h-9">
                {['Critical','High','Medium','Low'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2 h-9">
                {['technical','governance','financial','operational','reputational','compliance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Textarea placeholder="Mitigation plan" value={form.mitigation_plan} onChange={e => setForm(f => ({ ...f, mitigation_plan: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-16" />
            <Button disabled={createMutation.isPending || !form.title}
              onClick={() => createMutation.mutate(form)}
              className="w-full bg-red-600 hover:bg-red-700">
              {createMutation.isPending ? 'Logging…' : 'Log Risk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}