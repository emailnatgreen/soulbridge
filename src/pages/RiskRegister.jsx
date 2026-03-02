import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, Shield, BarChart3, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RiskCard from '@/components/risk/RiskCard';
import RiskMatrix from '@/components/risk/RiskMatrix';
import RiskForm from '@/components/risk/RiskForm';

const SEVERITY_SCORE = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const LIKELIHOOD_SCORE = { Rare: 1, Unlikely: 2, Possible: 3, Likely: 4, 'Almost Certain': 5 };

export default function RiskRegister() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: () => base44.entities.RiskRegister.list('-created_date', 100),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['ai-projects'],
    queryFn: () => base44.entities.AIProject.list('name', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('name', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RiskRegister.create({
      ...data,
      risk_score: (SEVERITY_SCORE[data.severity] || 1) * (LIKELIHOOD_SCORE[data.likelihood] || 1),
      last_reviewed_date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskRegister.update(id, {
      ...data,
      risk_score: (SEVERITY_SCORE[data.severity] || 1) * (LIKELIHOOD_SCORE[data.likelihood] || 1),
      last_reviewed_date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); setEditing(null); },
  });

  const handleStatusChange = (risk, newStatus) => {
    updateMutation.mutate({ id: risk.id, data: { ...risk, status: newStatus } });
  };

  const filtered = risks.filter(r => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const criticalCount = risks.filter(r => r.severity === 'Critical' && r.status !== 'Closed').length;
  const openCount = risks.filter(r => r.status !== 'Closed').length;
  const mitigatingCount = risks.filter(r => r.status === 'Mitigating').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to={createPageUrl('Home')} className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-900 font-medium">Risk Register</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                Risk Register
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Village-wide risk management framework</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Risk
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 mb-1">Total Risks</p>
              <p className="text-3xl font-bold text-gray-900">{risks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 mb-1">Open</p>
              <p className="text-3xl font-bold text-orange-600">{openCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 mb-1">Critical</p>
              <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 mb-1">Mitigating</p>
              <p className="text-3xl font-bold text-blue-600">{mitigatingCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" /> Risk Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskMatrix risks={risks.filter(r => r.status !== 'Closed')} />
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search risks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {['Technical','Security','Operational','Compliance','Financial','Strategic','Web3'].map(c =>
                <SelectItem key={c} value={c}>{c}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {['Low','Medium','High','Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['Identified','Assessed','Mitigating','Monitoring','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterCategory !== 'all' || filterSeverity !== 'all' || filterStatus !== 'all' || search) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterCategory('all'); setFilterSeverity('all'); setFilterStatus('all'); setSearch(''); }}>
              Clear
            </Button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} risks</span>
        </div>

        {/* Risk List */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{risks.length === 0 ? 'No risks registered yet. Add the first one.' : 'No risks match the current filters.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered
              .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
              .map(risk => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  onEdit={(r) => setEditing(r)}
                  onStatusChange={handleStatusChange}
                />
              ))}
          </div>
        )}
      </div>

      {/* Add Risk Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Risk</DialogTitle>
          </DialogHeader>
          <RiskForm
            projects={projects}
            agents={agents}
            isLoading={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Risk Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Risk</DialogTitle>
          </DialogHeader>
          {editing && (
            <RiskForm
              initial={editing}
              projects={projects}
              agents={agents}
              isLoading={updateMutation.isPending}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}