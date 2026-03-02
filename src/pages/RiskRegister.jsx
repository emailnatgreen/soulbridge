import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Plus, ShieldAlert, Filter, BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RiskCard from '@/components/risk/RiskCard';
import RiskForm from '@/components/risk/RiskForm';
import RiskMatrix from '@/components/risk/RiskMatrix';

const SEVERITY_SCORE = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const LIKELIHOOD_SCORE = { Rare: 1, Unlikely: 2, Possible: 3, Likely: 4, 'Almost Certain': 5 };

export default function RiskRegister() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);

  const { data: risks = [] } = useQuery({
    queryKey: ['risks'],
    queryFn: () => base44.entities.RiskRegister.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-risks'],
    queryFn: () => base44.entities.AIProject.list('name', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-risks'],
    queryFn: () => base44.entities.Agent.list('name', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const score = (SEVERITY_SCORE[data.severity] || 1) * (LIKELIHOOD_SCORE[data.likelihood] || 1);
      return base44.entities.RiskRegister.create({ ...data, risk_score: score, last_reviewed_date: new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => { qc.invalidateQueries(['risks']); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const score = (SEVERITY_SCORE[data.severity] || 1) * (LIKELIHOOD_SCORE[data.likelihood] || 1);
      return base44.entities.RiskRegister.update(id, { ...data, risk_score: score, last_reviewed_date: new Date().toISOString().split('T')[0] });
    },
    onSuccess: () => { qc.invalidateQueries(['risks']); setEditingRisk(null); },
  });

  const handleStatusChange = (risk, status) => {
    updateMutation.mutate({ id: risk.id, data: { ...risk, status } });
  };

  const handleEdit = (risk) => setEditingRisk(risk);

  const filtered = risks.filter(r => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const criticalCount = risks.filter(r => r.severity === 'Critical' && r.status !== 'Closed').length;
  const highCount = risks.filter(r => r.severity === 'High' && r.status !== 'Closed').length;
  const openCount = risks.filter(r => r.status !== 'Closed').length;
  const mitigatingCount = risks.filter(r => r.status === 'Mitigating').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                Risk Register
              </h1>
              <p className="text-sm text-gray-500">SoulBridge Village — Risk Management Framework</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMatrix(!showMatrix)}>
              <BarChart3 className="w-4 h-4 mr-2" /> {showMatrix ? 'Hide' : 'Show'} Matrix
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Risk
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
              <p className="text-xs text-red-600 mt-1">Critical (Open)</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{highCount}</p>
              <p className="text-xs text-orange-600 mt-1">High (Open)</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{openCount}</p>
              <p className="text-xs text-blue-600 mt-1">Total Open</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{mitigatingCount}</p>
              <p className="text-xs text-purple-600 mt-1">Being Mitigated</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Matrix */}
        {showMatrix && (
          <Card>
            <CardHeader><CardTitle className="text-base">Risk Heat Matrix</CardTitle></CardHeader>
            <CardContent><RiskMatrix risks={risks.filter(r => r.status !== 'Closed')} /></CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search risks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48"
          />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {['Technical','Security','Operational','Compliance','Financial','Strategic','Web3'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              {['Low','Medium','High','Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['Identified','Assessed','Mitigating','Monitoring','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterCategory !== 'all' || filterSeverity !== 'all' || filterStatus !== 'all' || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterCategory('all'); setFilterSeverity('all'); setFilterStatus('all'); setSearch(''); }}>
              Clear
            </Button>
          )}
          <span className="text-sm text-gray-500 ml-auto">{filtered.length} risk{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Risk List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No risks found</p>
            <p className="text-sm">Add your first risk to begin tracking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <RiskCard
                key={r.id}
                risk={r}
                onEdit={handleEdit}
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
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" /> Log New Risk
            </DialogTitle>
          </DialogHeader>
          <RiskForm
            projects={projects}
            agents={agents}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Risk Dialog */}
      <Dialog open={!!editingRisk} onOpenChange={(o) => !o && setEditingRisk(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" /> Edit Risk
            </DialogTitle>
          </DialogHeader>
          {editingRisk && (
            <RiskForm
              initial={editingRisk}
              projects={projects}
              agents={agents}
              onSubmit={(data) => updateMutation.mutate({ id: editingRisk.id, data })}
              onCancel={() => setEditingRisk(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}