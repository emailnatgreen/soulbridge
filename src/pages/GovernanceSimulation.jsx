import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Shield, Play, TrendingUp, Users, Vote, AlertTriangle, CheckCircle, XCircle, BarChart3, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function GovernanceSimulation() {
    const [scenarioType, setScenarioType] = useState('project_funding');
    const [customProposal, setCustomProposal] = useState('');
    const [selectedSimulation, setSelectedSimulation] = useState(null);
    const queryClient = useQueryClient();

    const { data: proposals = [] } = useQuery({
        queryKey: ['simulatedProposals'],
        queryFn: async () => {
            const all = await base44.entities.GovernanceProposal.list('-created_date', 50);
            return all.filter(p => p.action_data?.simulation === true);
        }
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const simulateMutation = useMutation({
        mutationFn: async (params) => {
            const response = await base44.functions.invoke('simulateGovernanceScenario', params);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['simulatedProposals']);
            setSelectedSimulation(data);
        }
    });

    const agentsWithPersonality = agents.filter(a => a.metadata?.personality_profile).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                                    <Shield className="w-8 h-8" />
                                    Governance Simulation
                                </h1>
                                <p className="text-sm text-purple-300/60">Test Law 8 - Decentralized Decision Making</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Simulations Run</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{proposals.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300/80">Passed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {proposals.filter(p => p.status === 'passed').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-red-300/80">Rejected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {proposals.filter(p => p.status === 'rejected').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80">Active Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{agentsWithPersonality}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Simulation Setup */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Play className="w-5 h-5 text-purple-400" />
                                Run New Simulation
                            </CardTitle>
                            <CardDescription className="text-white/60">
                                Test governance with AI-driven voting based on personalities
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {agentsWithPersonality < 2 && (
                                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-yellow-300">
                                            Need at least 2 agents with personalities to run meaningful simulations.
                                            Generate personalities from agent detail pages.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-white/60 mb-2 block">Scenario Type</label>
                                <Select value={scenarioType} onValueChange={setScenarioType}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="project_funding">Project Funding</SelectItem>
                                        <SelectItem value="role_adjustment">Role Adjustment</SelectItem>
                                        <SelectItem value="treasury_allocation">Treasury Allocation</SelectItem>
                                        <SelectItem value="law_amendment">Law Amendment</SelectItem>
                                        <SelectItem value="agent_discipline">Agent Discipline</SelectItem>
                                        <SelectItem value="resource_policy">Resource Policy</SelectItem>
                                        <SelectItem value="general">General Proposal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm text-white/60 mb-2 block">Custom Proposal (Optional)</label>
                                <Textarea
                                    value={customProposal}
                                    onChange={(e) => setCustomProposal(e.target.value)}
                                    placeholder="Describe a specific proposal to test..."
                                    className="bg-white/5 border-white/10 text-white min-h-24"
                                />
                            </div>

                            <Button
                                onClick={() => simulateMutation.mutate({ 
                                    scenario_type: scenarioType,
                                    custom_proposal: customProposal || undefined
                                })}
                                disabled={simulateMutation.isPending || agentsWithPersonality < 2}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            >
                                {simulateMutation.isPending ? (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                        Simulating Governance...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Simulation
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Latest Result */}
                    {selectedSimulation && (
                        <SimulationResultCard simulation={selectedSimulation} agents={agents} />
                    )}
                </div>

                {/* Simulation History */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-8">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Simulation History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {proposals.map(proposal => {
                                const totalPower = proposal.total_voting_power_cast || 1;
                                const supportPct = ((proposal.votes_for || 0) / totalPower) * 100;
                                
                                return (
                                    <div key={proposal.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className="text-white font-medium mb-1">{proposal.title}</h4>
                                                <Badge variant="outline" className="text-xs">
                                                    {proposal.proposal_type?.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            {proposal.status === 'passed' ? (
                                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Passed
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    Rejected
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-white/60 text-xs mb-1">Participation</p>
                                                <p className="text-white">{proposal.total_votes_cast} votes</p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-xs mb-1">Support</p>
                                                <p className="text-white">{supportPct.toFixed(1)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-xs mb-1">Voting Power</p>
                                                <p className="text-white">{totalPower.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {proposals.length === 0 && (
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
                                    <p className="text-white/40 text-sm">No simulations run yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SimulationResultCard({ simulation, agents }) {
    const agentMap = new Map(agents.map(a => [a.id, a]));

    return (
        <Card className="bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-blue-900/30 backdrop-blur-xl border-purple-500/40">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Latest Simulation Result
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Outcome */}
                <div className="p-4 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Outcome</span>
                        {simulation.outcome === 'passed' ? (
                            <Badge className="bg-green-500/30 text-green-300 border-green-500/50">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                PASSED
                            </Badge>
                        ) : (
                            <Badge className="bg-red-500/30 text-red-300 border-red-500/50">
                                <XCircle className="w-4 h-4 mr-1" />
                                REJECTED
                            </Badge>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                            <p className="text-xs text-white/60 mb-1">Participation Rate</p>
                            <p className="text-lg text-white">{simulation.participation_rate?.toFixed(1)}%</p>
                            <Progress value={simulation.participation_rate} className="mt-1 h-1" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60 mb-1">Support Rate</p>
                            <p className="text-lg text-white">{simulation.support_rate?.toFixed(1)}%</p>
                            <Progress value={simulation.support_rate} className="mt-1 h-1" />
                        </div>
                    </div>
                </div>

                {/* Analysis */}
                {simulation.analysis && (
                    <>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-sm text-white/90 mb-3">{simulation.analysis.outcome_analysis}</p>
                            {simulation.analysis.deliberation_quality && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-blue-300">Deliberation Quality:</span>
                                    <Badge variant="outline" className="text-xs">
                                        {simulation.analysis.deliberation_quality}/10
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {simulation.analysis.voting_patterns?.length > 0 && (
                            <div>
                                <p className="text-sm text-white/60 mb-2">Voting Patterns</p>
                                <div className="space-y-1">
                                    {simulation.analysis.voting_patterns.map((pattern, idx) => (
                                        <p key={idx} className="text-xs text-white/80 flex items-start gap-2">
                                            <span className="text-purple-400">•</span>
                                            {pattern}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {simulation.analysis.key_learnings?.length > 0 && (
                            <div>
                                <p className="text-sm text-white/60 mb-2">Key Learnings</p>
                                <div className="space-y-1">
                                    {simulation.analysis.key_learnings.map((learning, idx) => (
                                        <p key={idx} className="text-xs text-green-300/90 flex items-start gap-2">
                                            <span className="text-green-400">✓</span>
                                            {learning}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Vote Breakdown */}
                <div>
                    <p className="text-sm text-white/60 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Individual Votes ({simulation.votes_cast})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {simulation.vote_results?.map((vote, idx) => {
                            const voteColor = {
                                for: 'text-green-300',
                                against: 'text-red-300',
                                abstain: 'text-gray-300'
                            }[vote.vote];

                            return (
                                <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white text-sm font-medium">{vote.agent_name}</span>
                                        <Badge variant="outline" className={voteColor}>
                                            {vote.vote.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-white/60 mb-1">{vote.rationale}</p>
                                    <div className="flex items-center gap-2 text-xs text-white/40">
                                        <Vote className="w-3 h-3" />
                                        Power: {vote.voting_power.toFixed(1)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}