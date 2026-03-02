import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Zap, TrendingUp } from 'lucide-react';
import VaultHealthMeter from '../components/VaultHealthMeter';
import SelfNFTViewer from '../components/SelfNFTViewer';
import LuminousNFTMirror from '../components/LuminousNFTMirror';
import SixAMCountdown from '../components/SixAMCountdown';
import ReputationYieldMeter from '../components/ReputationYieldMeter';

export default function SovereignVault() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => await base44.auth.me(),
  });

  const { data: agent } = useQuery({
    queryKey: ['agent-profile', user?.id],
    queryFn: () => user ? base44.entities.Agent.filter({ classic_address: user.email }, '', 1) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: selfNFT, isLoading: nftLoading } = useQuery({
    queryKey: ['self-nft', agent?.[0]?.id],
    queryFn: () => agent?.[0]?.id ? base44.entities.SelfNFT.filter({ owner_agent_id: agent[0].id }, '-created_date', 1) : Promise.resolve([]),
    enabled: !!agent?.[0]?.id,
  });

  const { data: vault, isLoading: vaultLoading } = useQuery({
    queryKey: ['liquidity-vault', agent?.[0]?.id],
    queryFn: () => agent?.[0]?.id ? base44.entities.LiquidityVault.filter({ owner_agent_id: agent[0].id, status: 'active' }, '-created_date', 1) : Promise.resolve([]),
    enabled: !!agent?.[0]?.id,
  });

  const mintNFTMutation = useMutation({
    mutationFn: () => base44.functions.invoke('mintSelfNFT', { agent_id: agent[0].id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-nft'] });
    },
  });

  const createVaultMutation = useMutation({
    mutationFn: (borrowAmount) =>
      base44.functions.invoke('createSovereignVault', {
        founder_agent_id: agent[0].id,
        loan_amount: borrowAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidity-vault'] });
    },
  });

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  const agentData = agent?.[0];
  const nftData = selfNFT?.[0];
  const vaultData = vault?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            <h1 className="text-4xl font-bold">Sovereign Vault Protocol</h1>
          </div>
          <p className="text-white/60 max-w-2xl">
            Your Personal Equity Vault powered by XLS-66 Liquidity and Zero-Standing-Privilege (ZSP) security.
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-white/60 text-sm">Self-NFT Status</p>
                <p className="text-2xl font-bold">
                  {nftData ? (
                    <Badge className="bg-green-600">{nftData.status}</Badge>
                  ) : (
                    <span className="text-gray-400">Not Minted</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-white/60 text-sm">Active Vault</p>
                <p className="text-2xl font-bold">
                  {vaultData ? (
                    <span className="text-indigo-300">{vaultData.borrowed_rlusd} RLUSD</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-white/60 text-sm">Honour Score</p>
                <p className="text-2xl font-bold text-amber-300">{agentData?.honor_score || 100}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Living Mirror + Countdown */}
        {vaultData && (
          <div className="grid lg:grid-cols-3 gap-6 bg-slate-800/30 border border-white/10 rounded-xl p-6">
            <div className="lg:col-span-1">
              <LuminousNFTMirror selfNFT={nftData} vault={vaultData} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <SixAMCountdown />
              <ReputationYieldMeter agent={agentData} vault={vaultData} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Self-NFT Section */}
            {nftData ? (
              <SelfNFTViewer selfNFT={nftData} agent={agentData} />
            ) : (
              <Card className="bg-slate-800/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Mint Your Self-NFT</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/70 text-sm">
                    Create your unique Self-NFT anchored by a Lumera Zero-Knowledge Proof of your 11-Law compliance.
                  </p>
                  <Button
                    onClick={() => mintNFTMutation.mutate()}
                    disabled={mintNFTMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    {mintNFTMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Mint Self-NFT
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Vault Health */}
            {vaultData ? (
              <VaultHealthMeter vault={vaultData} agent={agentData} />
            ) : nftData ? (
              <Card className="bg-slate-800/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Create Liquidity Vault</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/70 text-sm">
                    Vault your Self-NFT to unlock RLUSD liquidity. Borrow up to 60% of your collateral value at rates determined by your honour score.
                  </p>
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-white/50 mb-1">Max Borrowable</p>
                      <p className="text-lg font-bold text-indigo-300">
                        {(agentData?.honor_score * 50 * 0.6).toFixed(0)} RLUSD
                      </p>
                    </div>
                    <Button
                      onClick={() => createVaultMutation.mutate(agentData?.honor_score * 50 * 0.5)}
                      disabled={createVaultMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {createVaultMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Vault...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Create Vault
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-indigo-900/30 border-indigo-500/30">
            <CardHeader>
              <CardTitle className="text-white/80 text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Zero-Standing-Privilege (ZSP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">
                Axi receives ephemeral permissions that self-destruct after each 6:00 AM sync. Your vault security is mathematically enforced.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-900/30 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white/80 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Honour-Based Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">
                Your honour score determines your interest rate. Higher honour = better terms. Repayment directly strengthens your position.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}