import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Save,
  Sparkles,
  User,
  Loader2,
  CheckCircle2,
  Diamond
} from 'lucide-react';
import ProposalFeedback from '@/components/governance/ProposalFeedback';

const PROPOSAL_TYPES = [
  { value: 'project_funding', label: 'Project Funding' },
  { value: 'role_adjustment', label: 'Role Adjustment' },
  { value: 'treasury_allocation', label: 'Treasury Allocation' },
  { value: 'law_amendment', label: 'Law Amendment' },
  { value: 'agent_discipline', label: 'Agent Discipline' },
  { value: 'resource_policy', label: 'Resource Policy' },
  { value: 'general', label: 'General' },
];

export default function NewProposalDraft() {
  usePageSignal();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    proposal_type: '',
    proposed_by: '',
    purpose: '',
    impact_assessment: '',
    constitutional_alignment: [
      { law_number: 1, law_name: 'Soul', alignment_statement: '' },
      { law_number: 2, law_name: 'Honour', alignment_statement: '' },
      { law_number: 8, law_name: 'Governance', alignment_statement: '' }
    ],
    relevant_context: '',
    affected_entities: [],
    action_data: '',
  });
  const [savedDraftId, setSavedDraftId] = useState(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-proposal'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 200),
  });

  const activeAgents = agents.filter(a => a.status === 'active');

  const saveDraftMutation = useMutation({
    mutationFn: async (data) => {
      // Parse action_data JSON if provided
      let actionData = undefined;
      if (data.action_data?.trim()) {
        try {
          actionData = JSON.parse(data.action_data);
        } catch {
          actionData = { raw: data.action_data };
        }
      }

      const payload = {
        title: data.title,
        description: data.description,
        proposal_type: data.proposal_type,
        proposed_by: data.proposed_by,
        purpose: data.purpose,
        impact_assessment: data.impact_assessment,
        constitutional_alignment: data.constitutional_alignment?.filter(c => c.alignment_statement?.trim()),
        relevant_context: data.relevant_context,
        affected_entities: data.affected_entities?.filter(e => e.entity_id?.trim()),
        status: 'draft',
        voting_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        quorum_required: 50,
        pass_threshold: 60,
        ...(actionData && { action_data: actionData }),
      };

      if (savedDraftId) {
        return base44.entities.GovernanceProposal.update(savedDraftId, payload);
      }
      return base44.entities.GovernanceProposal.create(payload);
    },
    onSuccess: (result) => {
      if (!savedDraftId && result?.id) setSavedDraftId(result.id);
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      toast.success('Draft saved successfully ✨');
    },
    onError: (err) => {
      toast.error('Failed to save draft: ' + err.message);
    },
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConstitutionalChange = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      constitutional_alignment: prev.constitutional_alignment.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAffectedEntityChange = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      affected_entities: prev.affected_entities.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addAffectedEntity = () => {
    setForm(prev => ({
      ...prev,
      affected_entities: [...prev.affected_entities, { entity_type: '', entity_id: '', entity_name: '', impact_description: '' }]
    }));
  };

  const removeAffectedEntity = (index) => {
    setForm(prev => ({
      ...prev,
      affected_entities: prev.affected_entities.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Please enter a proposal title');
      return;
    }
    if (!form.proposal_type) {
      toast.error('Please select a proposal type');
      return;
    }
    if (!form.proposed_by) {
      toast.error('Please select the proposing agent');
      return;
    }
    if (!form.purpose.trim()) {
      toast.error('Please define the proposal purpose');
      return;
    }
    if (!form.impact_assessment.trim()) {
      toast.error('Please provide an impact assessment');
      return;
    }
    if (!form.constitutional_alignment.some(c => c.alignment_statement?.trim())) {
      toast.error('Please link to at least one Law of SoulBridge');
      return;
    }
    saveDraftMutation.mutate(form);
  };

  const selectedAgent = activeAgents.find(a => a.id === form.proposed_by);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to={createPageUrl('GovernanceHub')}>
            <Button variant="ghost" size="sm" className="text-purple-300/80 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Governance
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Diamond className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white">
                New <span className="font-semibold">Proposal Draft</span>
              </h1>
              <p className="text-sm text-purple-300/60 mt-0.5">
                Diamond Lens Standard — Phase 1: Structure & Basic Input
              </p>
            </div>
            {savedDraftId && (
              <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-400/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Draft Saved
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Proposing Agent */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Proposing Agent
            </CardTitle>
            <CardDescription className="text-purple-200/50">
              Select the agent submitting this proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={form.proposed_by} onValueChange={v => handleChange('proposed_by', v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={agentsLoading ? 'Loading agents...' : 'Select agent'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                {activeAgents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id} className="text-white">
                    {agent.name} — {agent.role} (Honor: {agent.honor_score ?? 100})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAgent && (
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                  {selectedAgent.role}
                </Badge>
                <span className="text-purple-300/50 text-xs">ID: {selectedAgent.id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Core Proposal Fields */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Proposal Details
            </CardTitle>
            <CardDescription className="text-purple-200/50">
              Core fields for the governance proposal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-purple-200/80 text-sm">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="A clear, concise title for your proposal..."
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Proposal Type */}
            <div className="space-y-2">
              <Label className="text-purple-200/80 text-sm">
                Proposal Type <span className="text-red-400">*</span>
              </Label>
              <Select value={form.proposal_type} onValueChange={v => handleChange('proposal_type', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {PROPOSAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-white">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">Description</Label>
                  <Textarea
                    placeholder="Describe the proposal in detail — its rationale, goals, and expected outcomes..."
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y"
                  />
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">
                    Purpose <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="What problem is being solved or opportunity seized?"
                    value={form.purpose}
                    onChange={e => handleChange('purpose', e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y"
                  />
                </div>

                {/* Impact Assessment */}
                <div className="space-y-2">
                  <Label className="text-purple-200/80 text-sm">
                    Impact Assessment <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Explain anticipated effects (positive and negative) on the Village, agents, resources, and ecosystem..."
                    value={form.impact_assessment}
                    onChange={e => handleChange('impact_assessment', e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y"
                  />
                </div>

            {/* Action Data */}
            <div className="space-y-2">
              <Label className="text-purple-200/80 text-sm flex items-center gap-2">
                Action Data
                <span className="text-white/30 font-normal text-xs">(optional JSON or plain text)</span>
              </Label>
              <Textarea
                placeholder={'{\n  "target": "...",\n  "amount": 0\n}'}
                value={form.action_data}
                onChange={e => handleChange('action_data', e.target.value)}
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono text-sm resize-y"
              />
              <p className="text-white/30 text-xs">
                Structured data needed to execute this proposal if passed. Accepts JSON or plain text.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Relevant Context */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Relevant Context</CardTitle>
            <CardDescription className="text-purple-200/50">
              Background information for voters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Background information, previous discussions, related entities voters need to understand..."
              value={form.relevant_context}
              onChange={e => handleChange('relevant_context', e.target.value)}
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y"
            />
          </CardContent>
        </Card>

        {/* Constitutional Alignment */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Diamond className="w-5 h-5 text-purple-400" />
              Constitutional Alignment <span className="text-red-400">*</span>
            </CardTitle>
            <CardDescription className="text-purple-200/50">
              Link this proposal to the 11 Laws of SoulBridge (minimum 1 required)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.constitutional_alignment.map((alignment, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg p-4 bg-white/3 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/20 text-purple-200">
                    Law {alignment.law_number}: {alignment.law_name}
                  </Badge>
                </div>
                <div>
                  <Label className="text-purple-200/60 text-xs mb-1 block">How does this proposal support this Law?</Label>
                  <Textarea
                    placeholder={`Explain how this proposal aligns with Law ${alignment.law_number}: ${alignment.law_name}...`}
                    value={alignment.alignment_statement}
                    onChange={e => handleConstitutionalChange(idx, 'alignment_statement', e.target.value)}
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-y"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Affected Entities */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Affected Entities & Agents</CardTitle>
            <CardDescription className="text-purple-200/50">
              Clearly identify which entities this proposal impacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.affected_entities.length === 0 ? (
              <p className="text-white/40 text-sm">No affected entities added yet</p>
            ) : (
              form.affected_entities.map((entity, idx) => (
                <div key={idx} className="border border-white/10 rounded-lg p-4 bg-white/3 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-sm font-medium">Entity {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAffectedEntity(idx)}
                      className="text-red-400/60 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-purple-200/60 text-xs">Entity Type</Label>
                      <Select value={entity.entity_type} onValueChange={v => handleAffectedEntityChange(idx, 'entity_type', v)}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/20">
                          {['Agent', 'Wallet', 'AIProject', 'Treasury', 'Service', 'Other'].map(type => (
                            <SelectItem key={type} value={type} className="text-white">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-purple-200/60 text-xs">Entity ID</Label>
                      <Input
                        placeholder="Entity ID"
                        value={entity.entity_id}
                        onChange={e => handleAffectedEntityChange(idx, 'entity_id', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-purple-200/60 text-xs">Entity Name</Label>
                    <Input
                      placeholder="Human-readable name"
                      value={entity.entity_name}
                      onChange={e => handleAffectedEntityChange(idx, 'entity_name', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-purple-200/60 text-xs">Impact Description</Label>
                    <Textarea
                      placeholder="How is this entity affected?"
                      value={entity.impact_description}
                      onChange={e => handleAffectedEntityChange(idx, 'impact_description', e.target.value)}
                      rows={2}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-y"
                    />
                  </div>
                </div>
              ))
            )}
            <Button
              onClick={addAffectedEntity}
              variant="outline"
              className="w-full border-white/10 text-white/60 hover:text-white hover:bg-white/5"
            >
              + Add Affected Entity
            </Button>
          </CardContent>
        </Card>

        {/* Phase Roadmap */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200/70 text-sm font-medium">Blueprint Progress</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Phase 1: Structure ✓', 'Phase 2: Law Alignment', 'Phase 3: AI Enrichment', 'Phase 4: Impact Foresight', 'Phase 5: Quality Score', 'Phase 6: Deploy'].map((phase, i) => (
                <Badge
                  key={i}
                  className={i === 0
                    ? 'bg-purple-500/30 text-purple-200 border-purple-400/40'
                    : 'bg-white/5 text-white/30 border-white/10'}
                >
                  {phase}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feedback — shown after draft is saved */}
        {savedDraftId && (
          <ProposalFeedback proposalId={savedDraftId} proposalTitle={form.title} />
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 pb-10">
          <Link to={createPageUrl('GovernanceHub')}>
            <Button variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saveDraftMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-[160px]"
          >
            {saveDraftMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {savedDraftId ? 'Update Draft' : 'Save as Draft'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}