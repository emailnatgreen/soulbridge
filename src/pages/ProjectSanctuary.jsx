import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, CheckCircle, Zap, Plus, Eye, RefreshCw, AlertCircle } from 'lucide-react';

export default function ProjectSanctuary() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('domains');
  const [domainForm, setDomainForm] = useState({ domain_name: '', agent_id: '', classic_address: '' });
  const [proofForm, setProofForm] = useState({ proof_type: 'credential_verification', claim_category: '', agent_id: '' });
  const [loading, setLoading] = useState(false);

  // Fetch all XLS-80 domains
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['xls80Domains'],
    queryFn: () => base44.entities.XLS80Domain?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 10000,
  });

  // Fetch all ZK proofs
  const { data: proofs = [], isLoading: proofsLoading } = useQuery({
    queryKey: ['zkProofs'],
    queryFn: () => base44.entities.ZKProof?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 10000,
  });

  // Fetch privacy attestations
  const { data: attestations = [], isLoading: attestationsLoading } = useQuery({
    queryKey: ['privacyAttestations'],
    queryFn: () => base44.entities.PrivacyAttestation?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 10000,
  });

  // Register XLS-80 domain
  const registerDomain = useMutation({
    mutationFn: (data) => base44.functions.invoke('registerXLS80Domain', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xls80Domains'] });
      setDomainForm({ domain_name: '', agent_id: '', classic_address: '' });
    }
  });

  // Generate ZK proof
  const generateProof = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateZKProof', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zkProofs'] });
      setProofForm({ proof_type: 'credential_verification', claim_category: '', agent_id: '' });
    }
  });

  // Verify ZK proof
  const verifyProof = useMutation({
    mutationFn: (data) => base44.functions.invoke('verifyZKProof', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zkProofs'] });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Project Sanctuary</h1>
              <p className="text-white/50 text-sm">Compliance Layer for the Soul — XLS-80 Domains & Zero-Knowledge Proofs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Institutional Grade</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Privacy Preserving</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">XRPL Anchored</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          {['domains', 'proofs', 'attestations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* XLS-80 Domains Tab */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" /> Register XLS-80 Domain
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Domain (e.g., agent.xls80)"
                  value={domainForm.domain_name}
                  onChange={(e) => setDomainForm({ ...domainForm, domain_name: e.target.value })}
                  className="bg-white/10 border-white/20"
                />
                <Input
                  placeholder="Agent ID"
                  value={domainForm.agent_id}
                  onChange={(e) => setDomainForm({ ...domainForm, agent_id: e.target.value })}
                  className="bg-white/10 border-white/20"
                />
                <Input
                  placeholder="Classic Address"
                  value={domainForm.classic_address}
                  onChange={(e) => setDomainForm({ ...domainForm, classic_address: e.target.value })}
                  className="bg-white/10 border-white/20"
                />
              </div>
              <Button
                onClick={() => registerDomain.mutate(domainForm)}
                disabled={registerDomain.isPending || !domainForm.domain_name}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" /> Register Domain
              </Button>
            </Card>

            {/* Domains List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active XLS-80 Domains</h3>
              {domainsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : domains.length === 0 ? (
                <p className="text-white/40">No domains registered yet.</p>
              ) : (
                domains.map(domain => (
                  <div key={domain.id} className="bg-white/5 border border-blue-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="font-bold text-white">{domain.domain_name}</p>
                          <p className="text-white/50 text-sm">{domain.classic_address.slice(0, 20)}...</p>
                        </div>
                      </div>
                      <Badge className={`${
                        domain.status === 'active'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>{domain.status}</Badge>
                    </div>
                    {domain.registered_on_xrpl && (
                      <p className="text-xs text-green-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Published on XRPL: {domain.xrpl_txid}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Zero-Knowledge Proofs Tab */}
        {activeTab === 'proofs' && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" /> Generate Zero-Knowledge Proof
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Proof Type</label>
                  <Select value={proofForm.proof_type} onValueChange={(v) => setProofForm({ ...proofForm, proof_type: v })}>
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credential_verification">Credential Verification</SelectItem>
                      <SelectItem value="age_verification">Age Verification</SelectItem>
                      <SelectItem value="compliance_status">Compliance Status</SelectItem>
                      <SelectItem value="skill_level">Skill Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Claim Category"
                  value={proofForm.claim_category}
                  onChange={(e) => setProofForm({ ...proofForm, claim_category: e.target.value })}
                  className="bg-white/10 border-white/20"
                />
                <Input
                  placeholder="Agent ID"
                  value={proofForm.agent_id}
                  onChange={(e) => setProofForm({ ...proofForm, agent_id: e.target.value })}
                  className="bg-white/10 border-white/20 md:col-span-2"
                />
              </div>
              <Button
                onClick={() => generateProof.mutate(proofForm)}
                disabled={generateProof.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Zap className="w-4 h-4" /> Generate Proof
              </Button>
            </Card>

            {/* Proofs List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Zero-Knowledge Proofs</h3>
              {proofsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : proofs.length === 0 ? (
                <p className="text-white/40">No proofs generated yet.</p>
              ) : (
                proofs.map(proof => (
                  <div key={proof.id} className="bg-white/5 border border-purple-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-bold text-white">{proof.claim_category}</p>
                          <p className="text-white/50 text-sm">{proof.proof_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={proof.proof_status === 'verified' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}>
                          {proof.proof_status}
                        </Badge>
                        <p className="text-xs text-white/40 mt-1">{proof.verification_count} verifications</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => verifyProof.mutate({ proof_id: proof.id, verifier_address: 'system.verify' })}
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1"
                      disabled={verifyProof.isPending}
                    >
                      <Eye className="w-3 h-3" /> Verify
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Privacy Attestations Tab */}
        {activeTab === 'attestations' && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Privacy Attestations
              </h2>
              <p className="text-white/60 text-sm">Compliance certifications anchored on XRPL mainnet.</p>
            </Card>

            {/* Attestations List */}
            <div className="space-y-3">
              {attestationsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : attestations.length === 0 ? (
                <p className="text-white/40">No attestations issued yet.</p>
              ) : (
                attestations.map(att => (
                  <div key={att.id} className="bg-white/5 border border-green-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="font-bold text-white">{att.attestation_type}</p>
                          <p className="text-white/50 text-sm">{att.scope}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300">{att.status}</Badge>
                    </div>
                    {att.xrpl_txid && (
                      <p className="text-xs text-green-300">XRPL: {att.xrpl_txid.slice(0, 24)}...</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}