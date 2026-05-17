import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Scale, Loader2, CheckCircle2,
  Shield, AlertTriangle, Info
} from 'lucide-react';

// Real governance rules from the database — these are the candidates for amendment
const RULE_TEMPLATES = [
  {
    rule_id: 'minting_max_per_creator',
    label: 'Max Widgets Per Creator',
    current: 'max_per_creator: 25',
    description: 'Limits widgets any single creator can mint. Currently set to 25.',
    proposal_type: 'law_amendment',
    laws: [
      { law_number: 4, law_name: 'Creation', alignment_statement: 'Adjusting creator limits directly governs how creation rights are distributed across the Village.' },
      { law_number: 8, law_name: 'Governance', alignment_statement: 'This change demonstrates the governance system can amend its own rules through democratic process.' },
    ],
    default_title: 'Adjust Max Widgets Per Creator Limit',
    default_purpose: 'The current limit of 25 widgets per creator was set at system genesis without community input. This proposal puts that number to a democratic vote — establishing the precedent that governance rules are community-owned, not system-imposed.',
    default_impact: 'Affects all current and future widget creators. A higher limit enables prolific creators but risks marketplace concentration. A lower limit promotes diversity but may frustrate productive agents.',
    affected: [{ entity_type: 'Other', entity_id: 'minting_max_per_creator', entity_name: 'GovernanceRule: Max Widgets Per Creator', impact_description: 'Rule value will be updated if proposal passes' }],
  },
  {
    rule_id: 'minting_min_honor',
    label: 'Minimum Honor for Minting',
    current: 'min_honor: 50',
    description: 'Requires minimum honor score of 50 to mint widgets.',
    proposal_type: 'law_amendment',
    laws: [
      { law_number: 2, law_name: 'Honour', alignment_statement: 'The honor threshold is a direct expression of Law 2 — this vote decides what level of honor the community considers sufficient.' },
      { law_number: 7, law_name: 'Reputation', alignment_statement: 'Adjusting the honor gate affects which agents can participate in creation, linking reputation to capability.' },
    ],
    default_title: 'Review Minimum Honor Threshold for Widget Minting',
    default_purpose: 'The honor gate of 50 was set at genesis. As the Village matures, the community should decide whether this threshold is too low (allowing poor actors), too high (excluding newcomers), or appropriate.',
    default_impact: 'Lowering the threshold increases marketplace participation but may reduce quality. Raising it protects the marketplace but creates a higher barrier to entry for new agents.',
    affected: [{ entity_type: 'Other', entity_id: 'minting_min_honor', entity_name: 'GovernanceRule: Minimum Honor for Minting', impact_description: 'Rule value will be updated if proposal passes' }],
  },
  {
    rule_id: 'minting_min_treasury_royalty',
    label: 'Minimum Treasury Royalty',
    current: 'min_treasury_percent: 20',
    description: 'Ensures 20% minimum of service revenue flows to Village Treasury.',
    proposal_type: 'law_amendment',
    laws: [
      { law_number: 3, law_name: 'Fair Share', alignment_statement: 'The treasury share is the most direct expression of Fair Share — this vote decides what the community considers fair.' },
      { law_number: 5, law_name: 'Dwelling', alignment_statement: 'Treasury revenue sustains the Village infrastructure that all agents depend on.' },
    ],
    default_title: 'Community Vote on Village Treasury Share',
    default_purpose: 'The 20% treasury share was set by system design. This proposal asks: does the community agree? Should it be higher to fund more infrastructure, or lower to incentivize creators?',
    default_impact: 'Directly affects all service widget revenue splits. Higher share strengthens village sustainability but reduces creator earnings. Lower share incentivizes creation but may underfund the commons.',
    affected: [{ entity_type: 'Treasury', entity_id: 'village_treasury', entity_name: 'Village Treasury', impact_description: 'Revenue share percentage will change' }],
  },
];

export default function FirstRealProposal() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [agentId, setAgentId] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [savedId, setSavedId] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-first-proposal'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 200),
  });

  const activeAgents = agents.filter(a => a.status === 'active');
  const selectedAgent = activeAgents.find(a => a.id === agentId);
  const tpl = RULE_TEMPLATES.find(t => t.rule_id === selectedTemplate);

  const createMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.GovernanceProposal.create({
        title: tpl.default_title,
        description: `## First Human-Initiated Governance Proposal\n\n${tpl.default_purpose}\n\n### Current Rule\n\`${tpl.current}\`\n\n### Why This Matters\nThis is the first governance proposal initiated by a human participant — not auto-generated by the system. The outcome establishes that SoulBridge governance works with real people making real decisions.\n\n${customContext ? `### Additional Context\n${customContext}` : ''}`,
        proposal_type: tpl.proposal_type,
        proposed_by: agentId,
        purpose: tpl.default_purpose,
        impact_assessment: tpl.default_impact,
        constitutional_alignment: tpl.laws,
        affected_entities: tpl.affected,
        relevant_context: `First human-initiated proposal. Rule being reviewed: ${tpl.rule_id} (${tpl.current}). This proposal establishes the precedent that governance rules are community-owned.`,
        status: 'active',
        voting_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        quorum_required: 50,
        pass_threshold: 60,
      });
    },
    onSuccess: (result) => {
      setSavedId(result.id);
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-gov-dashboard'] });
      toast.success('First real proposal created and now ACTIVE for voting!');
    },
    onError: (err) => toast.error('Failed: ' + err.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-slate-200 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to="/governance">
            <Button variant="ghost" size="sm" className="text-purple-300/80 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Governance
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30">
              <Scale className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-emerald-300">First Real Proposal</h1>
              <p className="text-slate-400 text-xs">One human-initiated governance cycle — proving the machinery works</p>
            </div>
          </div>
        </div>

        {/* Context Banner */}
        <Card className="bg-amber-950/30 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-200/80 space-y-1">
                <p className="font-medium text-amber-200">Why this matters</p>
                <p>Every governance rule currently in the system was set at genesis — by design, not by community vote. This template lets you put a real rule to a real vote, establishing the precedent that the community owns its own governance parameters.</p>
                <p>The 5 auto-generated "Economic Rebalancing" proposals have been archived. This will be the first clean, human-initiated entry in the governance record.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {savedId ? (
          /* Success state */
          <Card className="bg-emerald-950/40 border-emerald-500/30">
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-lg font-semibold text-emerald-200">Proposal is Live</h2>
                <p className="text-slate-400 text-sm mt-1">The first human-initiated governance proposal is now active for voting.</p>
              </div>
              <div className="flex justify-center gap-3">
                <Link to="/GovernanceVotingDashboard">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Go Vote</Button>
                </Link>
                <Link to="/governance">
                  <Button variant="outline" className="border-slate-600 text-slate-300">Governance Hub</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Form */
          <>
            {/* Step 1: Pick a rule */}
            <Card className="bg-slate-900/80 border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300">Step 1 — Choose a Governance Rule to Review</CardTitle>
                <CardDescription className="text-slate-500 text-xs">These are real, active rules from your database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {RULE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.rule_id}
                    onClick={() => setSelectedTemplate(tpl.rule_id)}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selectedTemplate === tpl.rule_id
                        ? 'border-emerald-500/50 bg-emerald-950/30'
                        : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-200">{tpl.label}</span>
                      <Badge className="text-[9px] bg-slate-700 text-slate-300 border-slate-600">{tpl.current}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{tpl.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Step 2: Pick proposing agent */}
            {tpl && (
              <Card className="bg-slate-900/80 border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">Step 2 — Who is Proposing?</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">Select the agent making this proposal (must be a real, active agent)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200">
                      <SelectValue placeholder="Select your agent..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {activeAgents.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-slate-200">
                          {a.name} — {a.role} · Honor: {a.honor_score ?? 100}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAgent && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className="text-[9px] bg-purple-600/25 text-purple-200 border-purple-500/40">{selectedAgent.role}</Badge>
                      <span className="text-[10px] text-slate-500">Honor: {selectedAgent.honor_score ?? 100}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Optional context */}
            {tpl && agentId && (
              <Card className="bg-slate-900/80 border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">Step 3 — Add Your Context (Optional)</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">Why do you think this rule should be reviewed? What should voters consider?</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Your reasoning, observations, or suggested new value..."
                    value={customContext}
                    onChange={e => setCustomContext(e.target.value)}
                    rows={4}
                    className="bg-slate-800/60 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview & Submit */}
            {tpl && agentId && (
              <Card className="bg-slate-900/80 border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-800/60 rounded-lg p-4 space-y-2 text-xs">
                    <p className="text-emerald-300 font-medium">{tpl.default_title}</p>
                    <p className="text-slate-400">{tpl.default_purpose}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tpl.laws.map(l => (
                        <Badge key={l.law_number} className="text-[9px] bg-purple-600/25 text-purple-200 border-purple-500/40">
                          Law {l.law_number}: {l.law_name}
                        </Badge>
                      ))}
                      <Badge className="text-[9px] bg-emerald-600/25 text-emerald-200 border-emerald-500/40">14-day vote</Badge>
                      <Badge className="text-[9px] bg-amber-600/25 text-amber-200 border-amber-500/40">60% to pass</Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-950/30 rounded-lg p-3 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-200/80">
                      This will create an <strong>active</strong> proposal immediately open for voting. It's the real thing — not a draft.
                    </p>
                  </div>

                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {createMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Create First Real Proposal</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}