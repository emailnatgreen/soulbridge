import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Loader2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GRANT_PROGRAMS = [
  { value: 'ripple_xrpl_grants', label: 'XRPL Grants' },
  { value: 'ripple_creator_fund', label: 'Creator Fund' },
  { value: 'ripple_defi_fund', label: 'DeFi Fund' },
  { value: 'ripple_cbdc_fund', label: 'CBDC Fund' },
  { value: 'other', label: 'Other' },
];

export default function CreateGrantModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [program, setProgram] = useState('ripple_xrpl_grants');
  const [amount, setAmount] = useState('');
  const [milestones, setMilestones] = useState([{ title: '', description: '', target_date: '', budget_usd: '' }]);
  const [createRepo, setCreateRepo] = useState(true);
  const [saving, setSaving] = useState(false);

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', target_date: '', budget_usd: '' }]);
  };

  const removeMilestone = (i) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const updateMilestone = (i, field, value) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: field === 'budget_usd' ? (parseFloat(value) || 0) : value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setSaving(true);
    try {
      const validMilestones = milestones
        .filter(m => m.title.trim())
        .map((m, i) => ({ ...m, status: 'pending' }));

      const proposal = await base44.entities.GrantProposal.create({
        title: title.trim(),
        description: description.trim(),
        grant_program: program,
        requested_amount_usd: parseFloat(amount) || 0,
        milestones: validMilestones,
        status: 'drafting',
      });

      if (createRepo) {
        toast.info('Creating GitHub repository...');
        try {
          const repoRes = await base44.functions.invoke('createGrantRepo', {
            grant_proposal_id: proposal.id,
          });
          toast.success(`Repository created: ${repoRes.data.repository.name}`);
        } catch (e) {
          toast.error('Proposal created but GitHub repo failed: ' + (e?.response?.data?.error || e.message));
        }
      } else {
        toast.success('Grant proposal created');
      }

      onCreated();
    } catch (e) {
      toast.error('Failed to create proposal: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            New Grant Proposal
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <Label className="text-white/70 text-xs">Proposal Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. SoulBridge XRPL Agent Marketplace"
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-white/70 text-xs">Description *</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief overview of the grant proposal..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1 min-h-[80px] focus:outline-none focus:border-purple-400" />
          </div>

          {/* Program & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs">Grant Program</Label>
              <select value={program} onChange={e => setProgram(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-purple-400">
                {GRANT_PROGRAMS.map(p => <option key={p.value} value={p.value} className="bg-slate-900">{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Requested Amount (USD)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000"
                className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-white/70 text-xs">Milestones</Label>
              <button onClick={addMilestone} className="text-purple-400 text-xs flex items-center gap-1 hover:text-purple-300">
                <Plus className="w-3 h-3" /> Add Milestone
              </button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-semibold">Milestone {i + 1}</span>
                    {milestones.length > 1 && (
                      <button onClick={() => removeMilestone(i)} className="text-red-400/60 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input value={m.title} onChange={e => updateMilestone(i, 'title', e.target.value)}
                    placeholder="Milestone title" className="bg-white/5 border-white/10 text-white text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={m.target_date} onChange={e => updateMilestone(i, 'target_date', e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-xs" />
                    <Input type="number" value={m.budget_usd} onChange={e => updateMilestone(i, 'budget_usd', e.target.value)}
                      placeholder="Budget (USD)" className="bg-white/5 border-white/10 text-white text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Repo Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={createRepo} onChange={e => setCreateRepo(e.target.checked)}
              className="rounded border-white/20" />
            <span className="text-white/70 text-sm">Auto-create GitHub repository with grant structure</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose} className="text-white/50">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            Create Proposal
          </Button>
        </div>
      </div>
    </div>
  );
}