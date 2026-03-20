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
                rows={7}
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