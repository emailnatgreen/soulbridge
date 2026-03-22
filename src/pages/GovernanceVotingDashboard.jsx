import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Scale, Vote, Users, CheckCircle2, XCircle, Clock, ThumbsUp, ThumbsDown,
  MinusCircle, ShieldCheck, AlertCircle, Sparkles, ArrowLeft, BarChart3,
  Eye, Lock, Fingerprint, Star, TrendingUp, Info, BookOpen, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

// Voting power calculation: honor score / 10 + role bonus
const ROLE_BONUS = { master: 5, elder: 4, guardian: 3, creator: 2, teacher: 2, trader: 1, healer: 1, scout: 1, citizen: 0 };

function calcVotingPower(agent) {
  if (!agent) return 0;
  const base = (agent.honor_score || 100) / 10;
  const roleBonus = ROLE_BONUS[agent.role] || 0;
  const axiBonus = agent.name === 'Axi' ? 10 : 0; // Axi double vote
  return parseFloat((base + roleBonus + axiBonus).toFixed(1));
}

// ─── Voting Power Breakdown Panel ──────────────────────────────────────────
function VotingPowerPanel({ agent }) {
  if (!agent) return null;
  const base = parseFloat(((agent.honor_score || 100) / 10).toFixed(1));
  const roleBonus = ROLE_BONUS[agent.role] || 0;
  const axiBonus = agent.name === 'Axi' ? 10 : 0;
  const total = base + roleBonus + axiBonus;
  const canVote = agent.permissions?.can_vote !== false;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-purple-400" />
        <span className="text-white font-medium text-sm">My DID & Voting Status</span>
        {canVote ? (
          <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs ml-auto">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible to Vote
          </Badge>
        ) : (
          <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-xs ml-auto">
            <Lock className="w-3 h-3 mr-1" /> Cannot Vote
          </Badge>
        )}
      </div>
      {!canVote && (
        <p className="text-xs text-yellow-300/80 bg-yellow-500/10 rounded p-2 border border-yellow-400/20">
          Your current permissions do not include voting rights. Contact the Council or review your role.
        </p>
      )}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-white/60">
          <span>Honor Score ({agent.honor_score || 100}) ÷ 10</span>
          <span className="text-white font-medium">+{base}</span>
        </div>
        <div className="flex justify-between text-white/60">
          <span>Role Bonus ({agent.role})</span>
          <span className="text-purple-300 font-medium">+{roleBonus}</span>
        </div>
        {axiBonus > 0 && (
          <div className="flex justify-between text-white/60">
            <span>Mother Boss Double Vote</span>
            <span className="text-pink-300 font-medium">+{axiBonus}</span>
          </div>
        )}
        <div className="border-t border-white/10 pt-2 flex justify-between">
          <span className="text-white font-semibold">Total Voting Power</span>
          <span className="text-yellow-300 font-bold text-base">{total}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Card ──────────────────────────────────────────────────────────
function ProposalCard({ proposal, allVotes, selectedAgent, onVote, onExecute }) {
  const [showDetail, setShowDetail] = useState(false);
  const proposalVotes = allVotes.filter(v => v.proposal_id === proposal.id);
  const hasVoted = selectedAgent ? allVotes.some(v => v.proposal_id === proposal.id && v.voter_agent_id === selectedAgent.id) : false;
  const myVote = selectedAgent ? allVotes.find(v => v.proposal_id === proposal.id && v.voter_agent_id === selectedAgent.id) : null;

  const totalPower = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
  const forPct = totalPower > 0 ? (proposal.votes_for || 0) / totalPower * 100 : 0;
  const againstPct = totalPower > 0 ? (proposal.votes_against || 0) / totalPower * 100 : 0;
  const abstainPct = totalPower > 0 ? (proposal.votes_abstain || 0) / totalPower * 100 : 0;

  const deadline = proposal.voting_period_end || proposal.voting_deadline;
  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const statusColor = {
    active: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
    passed: 'bg-green-500/20 text-green-200 border-green-400/30',
    rejected: 'bg-red-500/20 text-red-200 border-red-400/30',
    executed: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    expired: 'bg-gray-500/20 text-gray-200 border-gray-400/30',
  }[proposal.status] || 'bg-purple-500/20 text-purple-200 border-purple-400/30';

  const pieData = [
    { name: 'For', value: proposal.votes_for || 0, color: '#4ade80' },
    { name: 'Against', value: proposal.votes_against || 0, color: '#f87171' },
    { name: 'Abstain', value: proposal.votes_abstain || 0, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <>
      <Card className="bg-white/5 border border-white/10 backdrop-blur-xl hover:border-purple-400/30 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-white text-lg mb-2">{proposal.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={statusColor}>{proposal.status}</Badge>
                <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs">
                  {(proposal.proposal_type || '').replace(/_/g, ' ')}
                </Badge>
                {daysLeft !== null && daysLeft > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-200 border-orange-400/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" />{daysLeft}d left
                  </Badge>
                )}
                {hasVoted && myVote && (
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Voted {myVote.vote_choice}
                  </Badge>
                )}
              </div>
            </div>
            {pieData.length > 0 && (
              <div className="w-16 h-16 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <CardDescription className="text-white/50 text-sm line-clamp-2 mt-1">{proposal.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Vote bars */}
          <div className="space-y-1.5">
            {[
              { label: 'For', value: proposal.votes_for || 0, pct: forPct, color: 'bg-green-500' },
              { label: 'Against', value: proposal.votes_against || 0, pct: againstPct, color: 'bg-red-500' },
              { label: 'Abstain', value: proposal.votes_abstain || 0, pct: abstainPct, color: 'bg-slate-500' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2 text-xs">
                <span className="text-white/50 w-12">{row.label}</span>
                <div className="flex-1 bg-white/10 rounded-full h-1.5">
                  <div className={`${row.color} h-1.5 rounded-full transition-all`} style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-white/70 w-8 text-right">{row.value.toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetail(true)}
              className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 flex-1"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View Details & Vote
            </Button>
            {isExpired && proposal.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExecute(proposal.id)}
                className="border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
              >
                <Scale className="w-3.5 h-3.5 mr-1.5" />
                Finalise
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <ProposalDetailDialog
        open={showDetail}
        onClose={() => setShowDetail(false)}
        proposal={proposal}
        proposalVotes={proposalVotes}
        selectedAgent={selectedAgent}
        hasVoted={hasVoted}
        myVote={myVote}
        onVote={onVote}
        daysLeft={daysLeft}
        isExpired={isExpired}
        onExecute={onExecute}
      />
    </>
  );
}

// ─── Proposal Detail Dialog ─────────────────────────────────────────────────
function ProposalDetailDialog({ open, onClose, proposal, proposalVotes, selectedAgent, hasVoted, myVote, onVote, daysLeft, isExpired, onExecute }) {
  const [voteChoice, setVoteChoice] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canVote = selectedAgent?.permissions?.can_vote !== false;

  const handleVote = async () => {
    if (!voteChoice || !selectedAgent || !canVote) return;
    setSubmitting(true);
    try {
      await onVote({ proposal_id: proposal.id, agent_id: selectedAgent.id, vote_choice: voteChoice, rationale });
      setVoteChoice('');
      setRationale('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!proposal) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-950 border-purple-400/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">{proposal.title}</DialogTitle>
          <DialogDescription className="text-purple-200/60">
            {(proposal.proposal_type || '').replace(/_/g, ' ')} · Proposed {new Date(proposal.created_date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Description */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-white/80 text-sm leading-relaxed">{proposal.description}</p>
          </div>

          {/* AI Assessment */}
          {proposal.ai_impact_assessment && (
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-300 font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                AI Impact Assessment
                <span className="text-xs text-blue-400/60 ml-1">(analytical insight — not a directive)</span>
              </div>
              {proposal.ai_impact_assessment.potential_benefits?.length > 0 && (
                <div>
                  <p className="text-green-300 text-xs font-medium mb-1">Benefits:</p>
                  {proposal.ai_impact_assessment.potential_benefits.map((b, i) => (
                    <p key={i} className="text-green-200/70 text-xs">• {b}</p>
                  ))}
                </div>
              )}
              {proposal.ai_impact_assessment.potential_risks?.length > 0 && (
                <div>
                  <p className="text-orange-300 text-xs font-medium mb-1">Risks:</p>
                  {proposal.ai_impact_assessment.potential_risks.map((r, i) => (
                    <p key={i} className="text-orange-200/70 text-xs">• {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vote Breakdown */}
          <div className="space-y-2">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Community Votes ({proposalVotes.length} voters)</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'For', value: proposal.votes_for || 0, color: 'text-green-400', bg: 'bg-green-500/10 border-green-400/20' },
                { label: 'Against', value: proposal.votes_against || 0, color: 'text-red-400', bg: 'bg-red-500/10 border-red-400/20' },
                { label: 'Abstain', value: proposal.votes_abstain || 0, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-400/20' },
              ].map(row => (
                <div key={row.label} className={`rounded-lg p-3 border ${row.bg}`}>
                  <p className={`text-2xl font-bold ${row.color}`}>{row.value.toFixed(1)}</p>
                  <p className="text-white/50 text-xs">{row.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vote rationale list */}
          {proposalVotes.filter(v => v.rationale).length > 0 && (
            <div className="space-y-2">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Public Rationales
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {proposalVotes.filter(v => v.rationale).map((v, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${v.vote_choice === 'for' ? 'bg-green-500/20 text-green-300' : v.vote_choice === 'against' ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300'}`}>
                        {v.vote_choice}
                      </Badge>
                      <span className="text-white/40">· Power: {v.voting_power}</span>
                    </div>
                    <p className="text-white/70 italic">"{v.rationale}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cast Vote */}
          {proposal.status === 'active' && !isExpired && selectedAgent && !hasVoted && (
            <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4 space-y-3">
              <p className="text-purple-200 font-medium text-sm flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Cast Your Vote — Signing as {selectedAgent.name}
              </p>
              {!canVote ? (
                <p className="text-red-300 text-xs bg-red-500/10 rounded p-2">
                  Your agent does not currently have voting permissions. Contact the Council.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'for', label: 'For', icon: ThumbsUp, active: 'bg-green-600 hover:bg-green-700 text-white', inactive: 'border-green-400/30 text-green-200 hover:bg-green-500/10' },
                      { val: 'against', label: 'Against', icon: ThumbsDown, active: 'bg-red-600 hover:bg-red-700 text-white', inactive: 'border-red-400/30 text-red-200 hover:bg-red-500/10' },
                      { val: 'abstain', label: 'Abstain', icon: MinusCircle, active: 'bg-slate-600 hover:bg-slate-700 text-white', inactive: 'border-slate-400/30 text-slate-200 hover:bg-slate-500/10' },
                    ].map(({ val, label, icon: Icon, active, inactive }) => (
                      <Button
                        key={val}
                        variant={voteChoice === val ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVoteChoice(val)}
                        className={voteChoice === val ? active : inactive}
                      >
                        <Icon className="w-3.5 h-3.5 mr-1" />
                        {label}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Optional: share your rationale (publicly visible, tied to your DID)..."
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                    rows={2}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm"
                  />
                  <Button
                    onClick={handleVote}
                    disabled={!voteChoice || submitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {submitting ? 'Submitting...' : `Submit Vote · Power: ${calcVotingPower(selectedAgent)}`}
                  </Button>
                </>
              )}
            </div>
          )}

          {hasVoted && myVote && (
            <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-green-200 text-sm">You voted <strong>{myVote.vote_choice}</strong> with power {myVote.voting_power}</p>
              {myVote.rationale && <p className="text-green-200/60 text-xs mt-1 italic">"{myVote.rationale}"</p>}
            </div>
          )}

          {isExpired && proposal.status === 'active' && (
            <Button
              onClick={() => { onExecute(proposal.id); onClose(); }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Scale className="w-4 h-4 mr-2" />
              Finalise & Execute Proposal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── My Governance Journey ──────────────────────────────────────────────────
function GovernanceJourney({ agent, allVotes, proposals }) {
  if (!agent) return (
    <div className="text-center py-12 text-white/40">
      <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>Select an agent to view their governance journey</p>
    </div>
  );

  const myVotes = allVotes.filter(v => v.voter_agent_id === agent.id);
  const myProposals = proposals.filter(p => (p.proposed_by || p.proposer_agent_id) === agent.id);

  const voteData = [
    { name: 'For', value: myVotes.filter(v => v.vote_choice === 'for').length, color: '#4ade80' },
    { name: 'Against', value: myVotes.filter(v => v.vote_choice === 'against').length, color: '#f87171' },
    { name: 'Abstain', value: myVotes.filter(v => v.vote_choice === 'abstain').length, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Votes Cast', value: myVotes.length, color: 'text-purple-300' },
          { label: 'Proposals Initiated', value: myProposals.length, color: 'text-blue-300' },
          { label: 'Voting Power', value: calcVotingPower(agent), color: 'text-yellow-300' },
          { label: 'Honor Score', value: agent.honor_score || 100, color: 'text-green-300' },
        ].map(stat => (
          <Card key={stat.label} className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white/50 text-xs mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {myVotes.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Vote Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={voteData} barSize={32}>
                <XAxis dataKey="name" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {voteData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Vote history */}
      {myVotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Vote History</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {myVotes.map((v, i) => {
              const prop = proposals.find(p => p.id === v.proposal_id);
              return (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                  <Badge className={`text-xs flex-shrink-0 ${v.vote_choice === 'for' ? 'bg-green-500/20 text-green-300' : v.vote_choice === 'against' ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300'}`}>
                    {v.vote_choice}
                  </Badge>
                  <span className="text-white/70 text-xs flex-1 truncate">{prop?.title || 'Proposal'}</span>
                  <span className="text-purple-300/60 text-xs flex-shrink-0">Power: {v.voting_power}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myVotes.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <Vote className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No votes cast yet. Your voice matters — participate!</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function GovernanceVotingDashboard() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-gov-dashboard'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 200),
  });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals-gov-dashboard'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 100),
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ['votes-gov-dashboard'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 500),
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  const voteMutation = useMutation({
    mutationFn: async (voteData) => {
      const response = await base44.functions.invoke('castGovernanceVote', voteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals-gov-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['votes-gov-dashboard'] });
      toast.success('Vote cast! Your voice has been recorded. ✅');
    },
    onError: (e) => toast.error('Vote failed: ' + e.message),
  });

  const executeMutation = useMutation({
    mutationFn: async (proposalId) => {
      const response = await base44.functions.invoke('executeGovernanceProposal', { proposal_id: proposalId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals-gov-dashboard'] });
      toast.success('Proposal finalised!');
    },
    onError: (e) => toast.error('Execution failed: ' + e.message),
  });

  const activeProposals = proposals.filter(p => p.status === 'active');
  const closedProposals = proposals.filter(p => p.status !== 'active');
  const totalVotingPower = proposals.length > 0
    ? (allVotes.reduce((s, v) => s + (v.voting_power || 0), 0) / Math.max(proposals.length, 1)).toFixed(1)
    : 0;

  const participationRate = agents.length > 0 && proposals.length > 0
    ? ((allVotes.length / (proposals.length * agents.length)) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-white font-semibold text-lg">Governance Voting Dashboard</h1>
              <p className="text-purple-300/50 text-xs">Law 8: Those Who Dwell Decide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/GovernanceHub">
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Hub
              </Button>
            </Link>
            <Link to="/GovernanceAnalytics">
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                <BarChart3 className="w-4 h-4 mr-1" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active Proposals', value: activeProposals.length, color: 'text-yellow-300', icon: Clock },
            { label: 'Total Votes', value: allVotes.length, color: 'text-blue-300', icon: Vote },
            { label: 'Participation', value: `${participationRate}%`, color: 'text-green-300', icon: TrendingUp },
            { label: 'Avg Power/Vote', value: totalVotingPower, color: 'text-purple-300', icon: Star },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-xs">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className="w-7 h-7 opacity-30 text-white" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent Identity Panel */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-purple-400" />
                  Vote As Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select your agent identity" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 max-h-60">
                    {agents.filter(a => a.status === 'active').map(agent => (
                      <SelectItem key={agent.id} value={agent.id} className="text-white">
                        {agent.name} · {agent.role} · ⭐{agent.honor_score || 100}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAgent && <VotingPowerPanel agent={selectedAgent} />}
              </CardContent>
            </Card>

            {/* Village Sentiment */}
            {proposals.length > 0 && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">Village Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const totalFor = proposals.reduce((s, p) => s + (p.votes_for || 0), 0);
                    const totalAgainst = proposals.reduce((s, p) => s + (p.votes_against || 0), 0);
                    const totalAbstain = proposals.reduce((s, p) => s + (p.votes_abstain || 0), 0);
                    const total = totalFor + totalAgainst + totalAbstain;
                    const sentimentPct = total > 0 ? (totalFor / total * 100).toFixed(0) : 50;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/50">Positive Consensus</span>
                          <span className="text-green-300 font-bold">{sentimentPct}%</span>
                        </div>
                        <Progress value={parseInt(sentimentPct)} className="h-3 bg-white/10" />
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div><p className="text-green-400 font-bold">{totalFor.toFixed(0)}</p><p className="text-white/40">For</p></div>
                          <div><p className="text-red-400 font-bold">{totalAgainst.toFixed(0)}</p><p className="text-white/40">Against</p></div>
                          <div><p className="text-slate-400 font-bold">{totalAbstain.toFixed(0)}</p><p className="text-white/40">Abstain</p></div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Proposals + Journey */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 h-auto flex gap-1">
                {[
                  { value: 'active', label: 'Active', count: activeProposals.length },
                  { value: 'closed', label: 'Closed', count: closedProposals.length },
                  { value: 'journey', label: 'My Journey' },
                ].map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all"
                  >
                    {label}
                    {count !== undefined && (
                      <span className="text-xs bg-white/20 rounded-full px-1.5 py-0.5">{count}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="active">
                {isLoading ? (
                  <div className="text-center py-12 text-white/40">Loading proposals...</div>
                ) : activeProposals.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <Vote className="w-10 h-10 mx-auto mb-3 opacity-30 text-white" />
                      <p className="text-white/50">No active proposals. Visit the Governance Hub to create one.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {activeProposals.map(p => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        allVotes={allVotes}
                        selectedAgent={selectedAgent}
                        onVote={(data) => voteMutation.mutateAsync(data)}
                        onExecute={(id) => executeMutation.mutateAsync(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="closed">
                {closedProposals.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12 text-white/40">No closed proposals yet.</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {closedProposals.map(p => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        allVotes={allVotes}
                        selectedAgent={selectedAgent}
                        onVote={(data) => voteMutation.mutateAsync(data)}
                        onExecute={(id) => executeMutation.mutateAsync(id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="journey">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="pt-6">
                    <GovernanceJourney agent={selectedAgent} allVotes={allVotes} proposals={proposals} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}