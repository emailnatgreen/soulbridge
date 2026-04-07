import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Plus, Loader2, Sparkles, Shield, AlertTriangle, Vote, Zap
} from 'lucide-react';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['planning', 'recruiting', 'active'];

// Platform agents that must route through governance
const PLATFORM_AGENT_NAMES = [
  'axi', 'code_node', 'lore_node', 'truth_weaver',
  'law_guardian', 'alignment_agent', 'ripple_architect',
  'epoch_architect', 'market_weaver',
];

function isPlatformAgent(agent) {
  if (!agent) return false;
  const name = (agent.name || '').toLowerCase().replace(/\s+/g, '_');
  return PLATFORM_AGENT_NAMES.some(p => name.includes(p));
}

function hasPublishedDID(agent) {
  return !!(agent?.wallet_id || agent?.classic_address);
}

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

  const selectedAgent = useMemo(
    () => agents.find(a => a.id === form.owner_agent_id),
    [agents, form.owner_agent_id]
  );

  const isAgentPlatform = isPlatformAgent(selectedAgent);
  const agentHasDID = hasPublishedDID(selectedAgent);

  // Filter agents to only those with published DIDs
  const eligibleAgents = useMemo(
    () => agents.filter(a => hasPublishedDID(a)),
    [agents]
  );

  const ineligibleCount = agents.length - eligibleAgents.length;

  // Standard project creation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const project = await base44.entities.AIProject.create({
        ...data,
        budget_drops: data.budget_drops ? Number(data.budget_drops) * 1000000 : null,
        spent_drops: 0,
        progress_percentage: 0,
        milestones: [],
        deliverables: [],
        risks: [],
        team_members: [],
      });

      // Generate KineticUnit for project creation (Law 5: Dwelling)
      await base44.entities.KineticUnit.create({
        ku_type: 'collaborative_action',
        agent_id: data.owner_agent_id,
        project_id: project.id,
        trigger_event: 'AIProject.create',
        trigger_entity_id: project.id,
        weight: 2.0,
        raw_score: 1.0,
        weighted_score: 2.0,
        mwtp_layer: 'meso',
        status: 'generated',
        constitutional_laws: ['Law 4: Creation', 'Law 5: Dwelling'],
        metadata: { title: data.title, priority: data.priority },
      });

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProjects'] });
      onCreated?.();
      onClose();
    },
  });

  // Governance proposal for platform agents
  const proposalMutation = useMutation({
    mutationFn: async (data) => {
      const proposal = await base44.entities.GovernanceProposal.create({
        title: `Project Proposal: ${data.title}`,
        description: `Platform Agent "${selectedAgent?.name}" proposes a new project:\n\n**${data.title}**\n\n${data.description}\n\nVision: ${data.vision || 'N/A'}\nPriority: ${data.priority}\nBudget: ${data.budget_drops ? `${data.budget_drops} XRP` : 'TBD'}`,
        proposal_type: 'project_funding',
        proposed_by: data.owner_agent_id,
        status: 'active',
        voting_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        quorum_required: 50,
        pass_threshold: 60,
        action_data: {
          project_data: {
            ...data,
            budget_drops: data.budget_drops ? Number(data.budget_drops) * 1000000 : null,
          },
        },
        constitutional_alignment: [
          { law_number: 4, law_name: 'Creation', alignment_statement: 'New project initiative for Village growth' },
          { law_number: 8, law_name: 'Governance', alignment_statement: 'Platform agent project requires community approval' },
        ],
      });

      // KU for governance proposal
      await base44.entities.KineticUnit.create({
        ku_type: 'governance_vote',
        agent_id: data.owner_agent_id,
        trigger_event: 'GovernanceProposal.create',
        trigger_entity_id: proposal.id,
        weight: 1.5,
        raw_score: 1.0,
        weighted_score: 1.5,
        mwtp_layer: 'meso',
        status: 'generated',
        constitutional_laws: ['Law 8: Governance'],
        metadata: { proposal_title: proposal.title },
      });

      return proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governanceProposals'] });
      onCreated?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim() || !form.owner_agent_id) return;
    if (!agentHasDID) return;

    if (isAgentPlatform) {
      proposalMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || proposalMutation.isPending;
  const canSubmit = form.title.trim() && form.description.trim() && form.owner_agent_id && agentHasDID && !isPending;

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

          {/* Header */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-b border-white/10 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
            </div>
            <p className="text-white/50 text-sm">Only agents with published DIDs may create projects (Law 1: Soul, Law 2: Honour)</p>
          </div>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* DID Eligibility Notice */}
            {ineligibleCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-300/80 text-xs">
                  {ineligibleCount} agent{ineligibleCount > 1 ? 's' : ''} without published DIDs are excluded. Only verified identities may initiate projects.
                </p>
              </div>
            )}

            {/* Owner Agent (DID-filtered) */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Project Owner (DID Required) *</label>
              <select
                value={form.owner_agent_id}
                onChange={e => setForm(f => ({ ...f, owner_agent_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
              >
                <option value="">Select verified agent...</option>
                {eligibleAgents.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-900">
                    {a.name} {isPlatformAgent(a) ? '(Platform)' : ''} — DID ✓
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Agent DID Status */}
            {selectedAgent && (
              <div className={`rounded-xl p-3 flex items-center gap-2 text-xs ${
                agentHasDID
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{selectedAgent.name}</strong>
                  {agentHasDID
                    ? ` — DID verified. ${isAgentPlatform ? 'Platform Agent: project will be submitted as Governance Proposal.' : 'Ready to create project.'}`
                    : ' — No published DID. Cannot create projects.'}
                </span>
              </div>
            )}

            {/* Platform Agent Governance Notice */}
            {isAgentPlatform && agentHasDID && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-start gap-2">
                <Vote className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-purple-300/80 text-xs">
                  <strong>Governance Gate (Law 8):</strong> Platform agent projects require community approval. This will create a Governance Proposal instead of an immediate project. The project will be activated after the proposal passes.
                </p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Project title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 resize-none"
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 resize-none"
              />
            </div>

            {/* Priority + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 uppercase tracking-wide block mb-1">Target Completion</label>
                <input
                  type="date"
                  value={form.target_completion_date}
                  onChange={e => setForm(f => ({ ...f, target_completion_date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
                />
                <Button onClick={addSkill} size="sm" className="bg-purple-600 hover:bg-purple-700 h-9">
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
              disabled={!canSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isAgentPlatform ? (
                <Vote className="w-4 h-4 mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {isAgentPlatform ? 'Submit Governance Proposal' : 'Create Project'}
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