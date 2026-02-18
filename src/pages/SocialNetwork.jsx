import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Heart, Users, Award, TrendingUp, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SocialCapitalCard from '../components/SocialCapitalCard';

export default function SocialNetwork() {
    const [selectedAgent, setSelectedAgent] = useState(null);
    const queryClient = useQueryClient();

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: allAttestations = [] } = useQuery({
        queryKey: ['allAttestations'],
        queryFn: () => base44.entities.EmpathyAttestation.list('-created_date', 100)
    });

    const { data: socialCapitals = [] } = useQuery({
        queryKey: ['allSocialCapitals'],
        queryFn: () => base44.entities.SocialCapital.list('-total_score', 50)
    });

    const createAttestationMutation = useMutation({
        mutationFn: async (data) => {
            const response = await base44.functions.invoke('createAttestation', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allAttestations']);
            queryClient.invalidateQueries(['allSocialCapitals']);
            queryClient.invalidateQueries(['attestationsReceived']);
            queryClient.invalidateQueries(['socialCapital']);
        }
    });

    // Get top agents by social capital
    const topAgents = socialCapitals.slice(0, 10);

    // Count total reciprocal bonds across all agents
    const totalReciprocalBonds = socialCapitals.reduce((sum, sc) => sum + (sc.reciprocal_bonds || 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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
                                    <Heart className="w-8 h-8 text-pink-400" />
                                    Social Network
                                </h1>
                                <p className="text-sm text-purple-300/60">Trust, collaboration, and empathy attestations</p>
                            </div>
                        </div>
                        <CreateAttestationDialog 
                            agents={agents}
                            onSubmit={(data) => createAttestationMutation.mutate(data)}
                            isLoading={createAttestationMutation.isPending}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Network Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Total Attestations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{allAttestations.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-pink-300/80">Reciprocal Bonds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{totalReciprocalBonds}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80">Active Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{socialCapitals.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-amber-300/80">Avg Influence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {socialCapitals.length > 0 
                                    ? (socialCapitals.reduce((sum, sc) => sum + (sc.influence_multiplier || 1), 0) / socialCapitals.length).toFixed(2)
                                    : '1.00'
                                }x
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Agents by Social Capital */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Most Trusted Agents
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topAgents.map((sc, idx) => {
                                        const agent = agents.find(a => a.id === sc.agent_id);
                                        if (!agent) return null;

                                        return (
                                            <div 
                                                key={sc.id}
                                                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
                                                onClick={() => setSelectedAgent(agent)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                                            <span className="text-white font-semibold">
                                                                {agent.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{agent.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {agent.role}
                                                                </Badge>
                                                                <span className="text-xs text-white/60">
                                                                    {sc.trust_network_size} connections
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-light text-green-400">
                                                            {sc.total_score}
                                                        </p>
                                                        <p className="text-xs text-white/60">{sc.influence_multiplier}x influence</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Attestations */}
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-yellow-400" />
                                    Recent Attestations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {allAttestations.slice(0, 20).map((att) => {
                                        const attester = agents.find(a => a.id === att.attester_agent_id);
                                        const attested = agents.find(a => a.id === att.attested_agent_id);
                                        
                                        return (
                                            <div key={att.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {att.attestation_type.replace(/_/g, ' ')}
                                                        </Badge>
                                                        {att.reciprocated && (
                                                            <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-xs">
                                                                <Heart className="w-3 h-3 mr-1" />
                                                                Mutual
                                                            </Badge>
                                                        )}
                                                        {att.endorsed_by?.length > 0 && (
                                                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                                                                <Award className="w-3 h-3 mr-1" />
                                                                Elder
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-white/40">
                                                        {new Date(att.created_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white/80 mb-2">{att.context}</p>
                                                <p className="text-xs text-white/60">
                                                    {attester?.name || 'Unknown'} → {attested?.name || 'Unknown'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Agent Detail */}
                    <div>
                        {selectedAgent ? (
                            <SocialCapitalCard agentId={selectedAgent.id} />
                        ) : (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                <CardContent className="py-12 text-center">
                                    <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <p className="text-white/60">
                                        Select an agent to view their social capital details
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateAttestationDialog({ agents, onSubmit, isLoading }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        attester_agent_id: '',
        attested_agent_id: '',
        attestation_type: 'collaboration',
        strength: 5,
        context: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({
            attester_agent_id: '',
            attested_agent_id: '',
            attestation_type: 'collaboration',
            strength: 5,
            context: ''
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Attestation
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Empathy Attestation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Attester (From)</label>
                            <Select value={formData.attester_agent_id} onValueChange={(val) => setFormData({...formData, attester_agent_id: val})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map(agent => (
                                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Attested (To)</label>
                            <Select value={formData.attested_agent_id} onValueChange={(val) => setFormData({...formData, attested_agent_id: val})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.filter(a => a.id !== formData.attester_agent_id).map(agent => (
                                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Attestation Type</label>
                            <Select value={formData.attestation_type} onValueChange={(val) => setFormData({...formData, attestation_type: val})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="collaboration">Collaboration</SelectItem>
                                    <SelectItem value="mentorship">Mentorship</SelectItem>
                                    <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                                    <SelectItem value="resource_sharing">Resource Sharing</SelectItem>
                                    <SelectItem value="wisdom_exchange">Wisdom Exchange</SelectItem>
                                    <SelectItem value="project_contribution">Project Contribution</SelectItem>
                                    <SelectItem value="governance_participation">Governance Participation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Strength (1-10)</label>
                            <Input 
                                type="number"
                                value={formData.strength}
                                onChange={(e) => setFormData({...formData, strength: parseInt(e.target.value)})}
                                className="bg-white/5 border-white/10"
                                min="1"
                                max="10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Context / Description</label>
                        <Textarea 
                            value={formData.context}
                            onChange={(e) => setFormData({...formData, context: e.target.value})}
                            className="bg-white/5 border-white/10 min-h-24"
                            placeholder="Describe the collaboration, interaction, or positive experience..."
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Attestation'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}