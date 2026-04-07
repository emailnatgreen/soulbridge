import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, Sparkles, Target, AlertTriangle } from 'lucide-react';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['planning', 'recruiting', 'active'];

export default function CreateProjectModal({ agents = [], onClose, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    vision: '',
    owner_agent_id: '',
    priority: 'medium',
    status: 'planning',
    required_skills: [],
    start_date: new Date().toISOString().split('T')[0],
    target_completion_date: '',
    budget_drops: '',
  });
  const [skillInput, setSkillInput] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.AIProject.create({
        ...data,
        budget_drops: data.budget_drops ? Number(data.budget_drops) * 1000000 : null,
        spent_drops: 0,
        progress_percentage: 0,
        milestones: [],
        deliverables: [],
        risks: [],
        team_members: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProjects'] });
      onCreated?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim() || !form.owner_agent_id) return;
    createMutation.mutate(form);
  };

  const addSkill = () => {
    if (skillInput.trim() && !form.required_skills.includes(skillInput.trim())) {
      setForm(f => ({ ...f, required_skills: [...f.required_skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setForm(f => ({ ...f, required_skills: f.required_skills.filter(s => s !== skill) }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>

          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-b border-white/10 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
            </div>
            <p className="text-white/50 text-sm">Define a new initiative for the Village</p>
          </div>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Project title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detailed project description..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 resize-none"
              />
            </div>

            {/* Vision */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Vision</label>
              <textarea
                value={form.vision}
                onChange={e => setForm(f => ({ ...f, vision: e.target.value }))}
                placeholder="Long-term vision and impact..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 resize-none"
              />
            </div>

            {/* Owner + Priority + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Owner *</label>
                <select
                  value={form.owner_agent_id}
                  onChange={e => setForm(f => ({ ...f, owner_agent_id: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
                >
                  <option value="">Select owner...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p} value={p} className="bg-slate-900">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} className="bg-slate-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Target Completion</label>
                <input
                  type="date"
                  value={form.target_completion_date}
                  onChange={e => setForm(f => ({ ...f, target_completion_date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Budget (XRP)</label>
              <input
                type="number"
                value={form.budget_drops}
                onChange={e => setForm(f => ({ ...f, budget_drops: e.target.value }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              />
            </div>

            {/* Required Skills */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
                />
                <Button onClick={addSkill} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.required_skills.map(skill => (
                    <Badge key={skill} className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs gap-1">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-white/10 p-4 flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !form.title.trim() || !form.description.trim() || !form.owner_agent_id}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Create Project
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}