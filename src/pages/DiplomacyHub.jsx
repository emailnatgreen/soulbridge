import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, HandshakeIcon, FileText, AlertCircle, CheckCircle, Clock, Users, Scroll } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DiplomacyHub() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedNegotiation, setSelectedNegotiation] = useState(null);
    const [newNegotiation, setNewNegotiation] = useState({
        initiator: '',
        recipients: [],
        type: 'alliance',
        terms: {}
    });
    const queryClient = useQueryClient();

    const { data: negotiations = [] } = useQuery({
        queryKey: ['negotiations'],
        queryFn: () => base44.entities.DiplomaticNegotiation.list('-created_date'),
        refetchInterval: 15000
    });

    const { data: treaties = [] } = useQuery({
        queryKey: ['treaties'],
        queryFn: () => base44.entities.Treaty.list('-created_date')
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const initiateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await base44.functions.invoke('initiateDiplomacy', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['negotiations']);
            setShowCreateDialog(false);
            setNewNegotiation({ initiator: '', recipients: [], type: 'alliance', terms: {} });
        }
    });

    const progressMutation = useMutation({
        mutationFn: async (data) => {
            const response = await base44.functions.invoke('progressNegotiation', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['negotiations']);
            setSelectedNegotiation(null);
        }
    });

    const finalizeMutation = useMutation({
        mutationFn: async (negotiation_id) => {
            const response = await base44.functions.invoke('finalizeAgreement', { negotiation_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['negotiations']);
            queryClient.invalidateQueries(['treaties']);
            setSelectedNegotiation(null);
        }
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    const activeNegotiations = negotiations.filter(n => ['proposed', 'negotiating'].includes(n.status));
    const concludedNegotiations = negotiations.filter(n => ['accepted', 'rejected', 'expired'].includes(n.status));

    const statusIcons = {
        proposed: Clock,
        negotiating: Users,
        accepted: CheckCircle,
        rejected: AlertCircle,
        expired: AlertCircle
    };

    const statusColors = {
        proposed: 'text-yellow-400',
        negotiating: 'text-blue-400',
        accepted: 'text-green-400',
        rejected: 'text-red-400',
        expired: 'text-gray-400'
    };

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
                                    <HandshakeIcon className="w-8 h-8" />
                                    Diplomacy Hub
                                </h1>
                                <p className="text-sm text-purple-300/60">Strategic negotiations & formal agreements</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                            Initiate Negotiation
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Active Negotiations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{activeNegotiations.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300/80">Active Treaties</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {treaties.filter(t => t.status === 'active').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80">Success Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {negotiations.length > 0 
                                    ? Math.round((negotiations.filter(n => n.status === 'accepted').length / negotiations.length) * 100)
                                    : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80">Total Negotiations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{negotiations.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Negotiations */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Active Negotiations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {activeNegotiations.map(neg => {
                                    const Icon = statusIcons[neg.status];
                                    const initiator = agentMap.get(neg.initiator_agent_id);
                                    return (
                                        <div
                                            key={neg.id}
                                            onClick={() => setSelectedNegotiation(neg)}
                                            className="p-3 bg-white/5 rounded border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-4 h-4 ${statusColors[neg.status]}`} />
                                                    <span className="text-white text-sm font-medium">{neg.title}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {neg.negotiation_type.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-white/60">
                                                Initiated by {initiator?.name} • {neg.negotiation_history?.length || 0} exchanges
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="text-xs text-white/40">
                                                    Success probability: {neg.success_probability}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeNegotiations.length === 0 && (
                                    <p className="text-white/40 text-center py-8">No active negotiations</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Treaties */}
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Scroll className="w-5 h-5" />
                                Active Treaties
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {treaties.filter(t => t.status === 'active').map(treaty => (
                                    <div key={treaty.id} className="p-3 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded border border-green-500/30">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-white text-sm font-medium">{treaty.name}</span>
                                            <Badge className="bg-green-500/30 text-green-300 text-xs capitalize">
                                                {treaty.treaty_type.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-white/60 mb-2">
                                            Signatories: {treaty.signatory_agent_ids.map(id => agentMap.get(id)?.name).join(', ')}
                                        </p>
                                        {treaty.impact_metrics && (
                                            <div className="text-xs text-green-300/80">
                                                Collaborations: {treaty.impact_metrics.collaborations_enabled || 0}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {treaties.filter(t => t.status === 'active').length === 0 && (
                                    <p className="text-white/40 text-center py-8">No active treaties</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent History */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Negotiation History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {concludedNegotiations.map(neg => {
                                const Icon = statusIcons[neg.status];
                                return (
                                    <div key={neg.id} className="p-3 bg-white/5 rounded border border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${statusColors[neg.status]}`} />
                                                <span className="text-white/80 text-sm">{neg.title}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {neg.status}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Negotiation Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Initiate Diplomatic Negotiation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-white/80 mb-2 block">Initiating Agent</label>
                            <Select value={newNegotiation.initiator} onValueChange={(v) => setNewNegotiation({...newNegotiation, initiator: v})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-white/80 mb-2 block">Negotiation Type</label>
                            <Select value={newNegotiation.type} onValueChange={(v) => setNewNegotiation({...newNegotiation, type: v})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="alliance">Alliance</SelectItem>
                                    <SelectItem value="trade_agreement">Trade Agreement</SelectItem>
                                    <SelectItem value="resource_sharing">Resource Sharing</SelectItem>
                                    <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                                    <SelectItem value="project_collaboration">Project Collaboration</SelectItem>
                                    <SelectItem value="governance_coalition">Governance Coalition</SelectItem>
                                    <SelectItem value="non_aggression_pact">Non-Aggression Pact</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-white/80 mb-2 block">Terms (JSON)</label>
                            <Textarea
                                placeholder='{"benefit": "mutual support", "duration": "1 year"}'
                                value={JSON.stringify(newNegotiation.terms)}
                                onChange={(e) => {
                                    try {
                                        setNewNegotiation({...newNegotiation, terms: JSON.parse(e.target.value)});
                                    } catch {}
                                }}
                                className="bg-white/5 border-white/10 text-white font-mono text-sm"
                                rows={4}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                initiateMutation.mutate({
                                    initiator_agent_id: newNegotiation.initiator,
                                    recipient_agent_ids: agents.filter(a => a.id !== newNegotiation.initiator).slice(0, 1).map(a => a.id),
                                    negotiation_type: newNegotiation.type,
                                    terms_proposed: newNegotiation.terms
                                });
                            }}
                            disabled={!newNegotiation.initiator || initiateMutation.isPending}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {initiateMutation.isPending ? 'Initiating...' : 'Initiate Negotiation'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Negotiation Details Dialog */}
            {selectedNegotiation && (
                <Dialog open={!!selectedNegotiation} onOpenChange={() => setSelectedNegotiation(null)}>
                    <DialogContent className="bg-slate-900 border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{selectedNegotiation.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="p-3 bg-white/5 rounded">
                                <h3 className="text-sm font-medium text-white/80 mb-2">Proposed Terms</h3>
                                <pre className="text-xs text-white/60 whitespace-pre-wrap">
                                    {JSON.stringify(selectedNegotiation.terms_proposed, null, 2)}
                                </pre>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-white/80 mb-2">Negotiation History</h3>
                                <div className="space-y-2">
                                    {selectedNegotiation.negotiation_history?.map((entry, idx) => (
                                        <div key={idx} className="p-2 bg-white/5 rounded text-sm">
                                            <div className="font-medium text-white/90">
                                                {agentMap.get(entry.agent_id)?.name} - {entry.action}
                                            </div>
                                            <p className="text-white/60 text-xs mt-1">{entry.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedNegotiation.status === 'accepted' && !selectedNegotiation.treaty_id && (
                                <Button
                                    onClick={() => finalizeMutation.mutate(selectedNegotiation.id)}
                                    disabled={finalizeMutation.isPending}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Finalize Treaty
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}