import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const CATEGORIES = ['Technical', 'Security', 'Operational', 'Compliance', 'Financial', 'Strategic', 'Web3'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const LIKELIHOODS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const STATUSES = ['Identified', 'Assessed', 'Mitigating', 'Monitoring', 'Closed'];

export default function RiskForm({ initial = {}, projects = [], agents = [], onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'Technical', severity: 'Medium',
    likelihood: 'Possible', status: 'Identified', mitigation_plan: '',
    contingency_plan: '', impact_description: '', project_id: '',
    project_name: '', owner_agent_id: '', owner_name: '',
    ...initial
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleProject = (id) => {
    const p = projects.find(p => p.id === id);
    set('project_id', id);
    set('project_name', p?.name || '');
  };

  const handleAgent = (id) => {
    const a = agents.find(a => a.id === id);
    set('owner_agent_id', id);
    set('owner_name', a?.name || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-gray-700">Risk Name *</Label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Multi-sig key compromise" required />
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-700">Description</Label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the risk in detail..." rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-gray-700">Category *</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-700">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-700">Severity *</Label>
          <Select value={form.severity} onValueChange={v => set('severity', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-700">Likelihood *</Label>
          <Select value={form.likelihood} onValueChange={v => set('likelihood', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LIKELIHOODS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-700">Impact if Materialised</Label>
        <Textarea value={form.impact_description} onChange={e => set('impact_description', e.target.value)} placeholder="What happens if this risk occurs?" rows={2} />
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-700">Mitigation Plan</Label>
        <Textarea value={form.mitigation_plan} onChange={e => set('mitigation_plan', e.target.value)} placeholder="Steps to reduce or eliminate this risk..." rows={2} />
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-700">Contingency Plan</Label>
        <Textarea value={form.contingency_plan} onChange={e => set('contingency_plan', e.target.value)} placeholder="Actions if the risk occurs despite mitigation..." rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-gray-700">Linked Project</Label>
          <Select value={form.project_id || 'none'} onValueChange={v => handleProject(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-700">Risk Owner (Agent)</Label>
          <Select value={form.owner_agent_id || 'none'} onValueChange={v => handleAgent(v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
          {isLoading ? 'Saving...' : 'Save Risk'}
        </Button>
      </div>
    </form>
  );
}