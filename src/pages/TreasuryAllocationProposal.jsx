import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, Vault, Users, ArrowRight, Shield, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const SIGNERS = [
  { name: 'Nathan (Human Node)', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia' },
  { name: 'Lore Node', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7' },
  { name: 'Truth Node', address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV' },
  { name: 'DID IT Node', address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny' },
];

export default function TreasuryAllocationProposal() {
  const [agents, setAgents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    proposed_by: '',
    recipient_name: '',
    recipient_address: '',
    amount_xrp: '',
    justification: '',
    voting_days: '7',
  });

  useEffect(() => {
    base44.entities.Agent.list().then(setAgents).catch(() => {});
    base44.entities.GovernanceProposal.filter({ proposal_type: 'treasury_allocation' }, '-created_date', 20)
      .then(setProposals).catch(() => {});
  }, [submitted]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.proposed_by || !form.recipient_address || !form.amount_xrp || !form.justification) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isNaN(parseFloat(form.amount_xrp)) || parseFloat(form.amount_xrp) <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setLoading(true);
    const votingEnd = new Date();
    votingEnd.setDate(votingEnd.getDate() + parseInt(form.voting_days));

    await base44.entities.GovernanceProposal.create({
      title: form.title,
      description: form.description,
      proposal_type: 'treasury_allocation',
      proposed_by: form.proposed_by,
      status: 'active',
      voting_period_end: votingEnd.toISOString(),
      quorum_required: 50,
      pass_threshold: 60,
      action_data: {
        recipient_address: form.recipient_address,
        recipient_name: form.recipient_name,
        amount_xrp: parseFloat(form.amount_xrp),
        justification: form.justification,
        treasury_address: TREASURY_ADDRESS,
        multisig_signatures: [],
      },
    });

    setLoading(false);
    setSubmitted(true);
    setForm({
      title: '', description: '', proposed_by: '', recipient_name: '',
      recipient_address: '', amount_xrp: '', justification: '', voting_days: '7',
    });
    setTimeout(() => setSubmitted(false), 5000);
  };

  const statusColor = (s) => ({
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    passed: 'bg-green-500/20 text-green-300 border-green-500/30',
    executed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    expired: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  }[s] || 'bg-gray-500/20 text-gray-300');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Vault className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-light text-white">Treasury Allocation Proposal</h1>
            </div>
            <p className="text-white/50 text-sm">Submit a governed spending request — Law 3 (Fair Share) · Law 8 (Governance)</p>
          </div>
          <Link to="/Governance">
            <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white/10">← Governance Hub</Button>
          </Link>
        </div>

        {/* Quorum Info */}
        <Card className="bg-white/5 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> 2-of-4 Multi-Sig Quorum — SoulBridge Treasury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SIGNERS.map(s => (
                <div key={s.address} className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/80 text-xs font-medium">{s.name}</div>
                  <div className="text-white/30 text-xs font-mono mt-1 truncate">{s.address.slice(0, 10)}…</div>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Approved proposals require 2 quorum members to co-sign the XRPL transaction before execution.
            </p>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" /> New Treasury Allocation Proposal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted && (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6 text-green-300">
                <CheckCircle className="w-5 h-5" />
                Proposal submitted successfully. It is now open for community voting.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300">
                <AlertTriangle className="w-5 h-5" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-white/70">Proposal Title *</Label>
                  <Input value={form.title} onChange={e => handleChange('title', e.target.value)}
                    placeholder="e.g. Fund the Lore Node Archive Project"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Proposed By (Agent) *</Label>
                  <select value={form.proposed_by} onChange={e => handleChange('proposed_by', e.target.value)}
                    className="w-full h-9 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
                    <option value="">Select agent…</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Proposal Description</Label>
                <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
                  placeholder="Brief overview of this proposal…"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-20" />
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="text-purple-300 text-xs uppercase tracking-widest mb-4">Treasury Transfer Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-white/70">Recipient Name *</Label>
                    <Input value={form.recipient_name} onChange={e => handleChange('recipient_name', e.target.value)}
                      placeholder="e.g. Lore Node"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Recipient XRPL Address *</Label>
                    <Input value={form.recipient_address} onChange={e => handleChange('recipient_address', e.target.value)}
                      placeholder="r…"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Amount (XRP) *</Label>
                    <Input type="number" min="0.000001" step="0.000001"
                      value={form.amount_xrp} onChange={e => handleChange('amount_xrp', e.target.value)}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Voting Period (days)</Label>
                    <Input type="number" min="1" max="30"
                      value={form.voting_days} onChange={e => handleChange('voting_days', e.target.value)}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Justification *</Label>
                <Textarea value={form.justification} onChange={e => handleChange('justification', e.target.value)}
                  placeholder="Provide a detailed justification for this treasury allocation. How does it serve the Village and uphold Law 3 (Fair Share)?"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-28" />
              </div>

              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-200 text-xs">
                <Shield className="w-4 h-4 flex-shrink-0" />
                Treasury: <span className="font-mono">{TREASURY_ADDRESS}</span> — This proposal, once passed, requires 2-of-4 multi-sig signers to execute on XRPL Mainnet.
              </div>

              <Button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 text-base gap-2">
                {loading ? 'Submitting…' : <>Submit Proposal <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Proposals */}
        {proposals.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Active Treasury Proposals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposals.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{p.title}</p>
                      {p.action_data?.recipient_name && (
                        <p className="text-white/50 text-xs mt-1">
                          → {p.action_data.recipient_name} · <span className="font-mono">{p.action_data.recipient_address?.slice(0, 12)}…</span> · <span className="text-amber-300 font-semibold">{p.action_data.amount_xrp} XRP</span>
                        </p>
                      )}
                    </div>
                    <Badge className={statusColor(p.status)}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-white/30 text-xs">
                    <span>Votes For: {p.votes_for ?? 0}</span>
                    <span>Against: {p.votes_against ?? 0}</span>
                    {p.voting_period_end && (
                      <span>Ends: {new Date(p.voting_period_end).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}