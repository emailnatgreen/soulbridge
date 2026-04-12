import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Loader2, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GRANT_PROGRAMS = [
  { value: 'ripple_xrpl_grants', label: 'XRPL Grants' },
  { value: 'ripple_ai_fund', label: 'AI Fund' },
  { value: 'ripple_defi_fund', label: 'DeFi / Onchain Finance' },
  { value: 'ripple_accelerator', label: 'XRPL Accelerator' },
  { value: 'other', label: 'Other' },
];

const USE_CASES = [
  { value: 'defi', label: 'DeFi' },
  { value: 'rwa_tokenization', label: 'Real World Asset Tokenization' },
  { value: 'payments', label: 'Payments' },
  { value: 'trade_finance', label: 'Trade Finance' },
  { value: 'ai', label: 'Artificial Intelligence' },
  { value: 'infrastructure', label: 'Infrastructure / Tooling' },
  { value: 'developer_tooling', label: 'Developer Tooling' },
  { value: 'other', label: 'Other' },
];

const XRPL_FEATURES = [
  'DEX', 'AMM', 'Hooks', 'DID', 'NFTs (XLS-20)', 'Escrow', 'Payment Channels',
  'Multi-signing', 'Trust Lines', 'RLUSD', 'Clawback', 'Credentials', 'Oracles',
];

export default function CreateGrantModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [program, setProgram] = useState('ripple_xrpl_grants');
  const [useCase, setUseCase] = useState('');
  const [amount, setAmount] = useState('');
  const [milestones, setMilestones] = useState([{ title: '', description: '', target_date: '', budget_usd: '', success_criteria: '' }]);
  const [createRepo, setCreateRepo] = useState(true);
  const [saving, setSaving] = useState(false);

  // XRPL Integration
  const [xrplFeatures, setXrplFeatures] = useState([]);
  const [xrplOnchain, setXrplOnchain] = useState('');
  const [xrplNetwork, setXrplNetwork] = useState('mainnet');

  // Market & Traction
  const [problemStatement, setProblemStatement] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [sustainabilityPlan, setSustainabilityPlan] = useState('');
  const [technicalArchitecture, setTechnicalArchitecture] = useState('');

  // Collapsible sections
  const [showXrpl, setShowXrpl] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showTech, setShowTech] = useState(false);

  const toggleFeature = (f) => {
    setXrplFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', target_date: '', budget_usd: '', success_criteria: '' }]);
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
        .map(m => ({ ...m, status: 'pending' }));

      const proposalData = {
        title: title.trim(),
        description: description.trim(),
        grant_program: program,
        use_case_category: useCase || undefined,
        requested_amount_usd: parseFloat(amount) || 0,
        milestones: validMilestones,
        status: 'drafting',
        technical_architecture: technicalArchitecture || undefined,
        sustainability_plan: sustainabilityPlan || undefined,
      };

      if (xrplFeatures.length > 0 || xrplOnchain) {
        proposalData.xrpl_integration = {
          xrpl_features_used: xrplFeatures,
          onchain_activity_description: xrplOnchain,
          xrpl_network: xrplNetwork,
        };
      }

      if (problemStatement || targetMarket) {
        proposalData.market_opportunity = {
          problem_statement: problemStatement,
          target_market: targetMarket,
        };
      }

      const proposal = await base44.entities.GrantProposal.create(proposalData);

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
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            New Grant Proposal
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Core Fields */}
          <div>
            <Label className="text-white/70 text-xs">Proposal Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. SoulBridge XRPL Agent Marketplace"
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>

          <div>
            <Label className="text-white/70 text-xs">Description *</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief overview of the grant proposal..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1 min-h-[80px] focus:outline-none focus:border-purple-400" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-white/70 text-xs">Grant Program</Label>
              <select value={program} onChange={e => setProgram(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none">
                {GRANT_PROGRAMS.map(p => <option key={p.value} value={p.value} className="bg-slate-900">{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Use Case</Label>
              <select value={useCase} onChange={e => setUseCase(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none">
                <option value="" className="bg-slate-900">Select...</option>
                {USE_CASES.map(u => <option key={u.value} value={u.value} className="bg-slate-900">{u.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Amount (USD)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000"
                className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>

          {/* XRPL Integration Section */}
          <CollapsibleSection title="XRPL Integration" subtitle="Critical for judges" open={showXrpl} onToggle={() => setShowXrpl(!showXrpl)}>
            <div className="space-y-3">
              <div>
                <Label className="text-white/70 text-xs">XRPL Features Used</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {XRPL_FEATURES.map(f => (
                    <button key={f} onClick={() => toggleFeature(f)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                        xrplFeatures.includes(f) ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-xs">On-Chain Activity Description</Label>
                <textarea value={xrplOnchain} onChange={e => setXrplOnchain(e.target.value)}
                  placeholder="How does this project drive on-chain transactions on XRPL?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs mt-1 min-h-[50px] focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Target Network</Label>
                <select value={xrplNetwork} onChange={e => setXrplNetwork(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs mt-1 focus:outline-none">
                  <option value="mainnet" className="bg-slate-900">Mainnet</option>
                  <option value="testnet" className="bg-slate-900">Testnet</option>
                  <option value="both" className="bg-slate-900">Both</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* Market Opportunity Section */}
          <CollapsibleSection title="Market Opportunity" subtitle="Judges evaluate market gap" open={showMarket} onToggle={() => setShowMarket(!showMarket)}>
            <div className="space-y-3">
              <div>
                <Label className="text-white/70 text-xs">Problem Statement</Label>
                <textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)}
                  placeholder="What problem does this solve in the XRPL ecosystem?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs mt-1 min-h-[50px] focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Target Market</Label>
                <Input value={targetMarket} onChange={e => setTargetMarket(e.target.value)}
                  placeholder="Who is the target audience?" className="bg-white/5 border-white/10 text-white text-xs mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Sustainability Plan</Label>
                <textarea value={sustainabilityPlan} onChange={e => setSustainabilityPlan(e.target.value)}
                  placeholder="Long-term financial sustainability beyond grant funding"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs mt-1 min-h-[50px] focus:outline-none focus:border-purple-400" />
              </div>
            </div>
          </CollapsibleSection>

          {/* Technical Architecture */}
          <CollapsibleSection title="Technical Architecture" subtitle="Code walkthrough quality" open={showTech} onToggle={() => setShowTech(!showTech)}>
            <textarea value={technicalArchitecture} onChange={e => setTechnicalArchitecture(e.target.value)}
              placeholder="Overview of the technical architecture, stack, and design approach..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs min-h-[80px] focus:outline-none focus:border-purple-400" />
          </CollapsibleSection>

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
                  <Input value={m.success_criteria || ''} onChange={e => updateMilestone(i, 'success_criteria', e.target.value)}
                    placeholder="Success criteria (how to verify completion)" className="bg-white/5 border-white/10 text-white text-xs" />
                </div>
              ))}
            </div>
          </div>

          {/* Create Repo Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={createRepo} onChange={e => setCreateRepo(e.target.checked)}
              className="rounded border-white/20" />
            <span className="text-white/70 text-sm">Auto-create GitHub repository (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10 sticky bottom-0 bg-slate-900">
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

function CollapsibleSection({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 transition">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
          <span className="text-white/80 text-xs font-semibold">{title}</span>
          {subtitle && <span className="text-amber-400/60 text-[10px]">— {subtitle}</span>}
        </div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}