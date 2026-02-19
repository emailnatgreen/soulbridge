import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Beaker, Play, CheckCircle, Users, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EventDecisionPoint from '../components/EventDecisionPoint';
import EventNarrativeCard from '../components/EventNarrativeCard';

export default function SimulationLab() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const queryClient = useQueryClient();

    const { data: events = [] } = useQuery({
        queryKey: ['simulatedEvents'],
        queryFn: () => base44.entities.SimulatedEvent.list('-created_date', 50),
        refetchInterval: 10000
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const { data: decisions = [] } = useQuery({
        queryKey: ['agentDecisions', selectedEvent?.id],
        queryFn: () => selectedEvent ? base44.entities.AgentDecision.filter({ simulated_event_id: selectedEvent.id }) : [],
        enabled: !!selectedEvent
    });

    const createEventMutation = useMutation({
        mutationFn: async (eventData) => {
            const response = await base44.functions.invoke('createSimulatedEvent', {
                ...eventData,
                use_ai_generation: true
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['simulatedEvents']);
            setShowCreateDialog(false);
        }
    });

    const participateMutation = useMutation({
        mutationFn: async ({ event_id, agent_id }) => {
            const response = await base44.functions.invoke('agentParticipateInEvent', { event_id, agent_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['simulatedEvents']);
        }
    });

    const concludeMutation = useMutation({
        mutationFn: async (event_id) => {
            const response = await base44.functions.invoke('concludeSimulatedEvent', { event_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['simulatedEvents']);
            setSelectedEvent(null);
        }
    });

    const eventTypeColors = {
        resource_challenge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        discovery: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        social_dilemma: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        governance_test: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        crisis_response: 'bg-red-500/10 text-red-400 border-red-500/20',
        collaboration_test: 'bg-green-500/10 text-green-400 border-green-500/20'
    };

    const statusIcons = {
        pending: { icon: AlertTriangle, color: 'text-yellow-400' },
        active: { icon: Play, color: 'text-green-400' },
        concluded: { icon: CheckCircle, color: 'text-blue-400' }
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
                                    <Beaker className="w-8 h-8" />
                                    Simulation Lab
                                </h1>
                                <p className="text-sm text-purple-300/60">Train agents through simulated scenarios</p>
                            </div>
                        </div>
                        <CreateEventDialog 
                            agents={agents}
                            onSubmit={(data) => createEventMutation.mutate(data)}
                            isLoading={createEventMutation.isPending}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-white/60">Total Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{events.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300/80">Active</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {events.filter(e => e.status === 'active').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-300/80">Completed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {events.filter(e => e.status === 'concluded').length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-purple-300/80">Total Participants</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">
                                {events.reduce((sum, e) => sum + (e.involved_agents?.length || 0), 0)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Events List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {events.map(event => {
                        const StatusIconComponent = statusIcons[event.status]?.icon || Play;
                        const statusColor = statusIcons[event.status]?.color || 'text-gray-400';
                        
                        return (
                            <Card key={event.id} className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-white mb-2">{event.name}</CardTitle>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge className={`${eventTypeColors[event.event_type]} border text-xs`}>
                                                    {event.event_type.replace(/_/g, ' ')}
                                                </Badge>
                                                <Badge variant="outline" className={`text-xs ${statusColor}`}>
                                                    <StatusIconComponent className="w-3 h-3 mr-1" />
                                                    {event.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <CardDescription className="text-white/60 line-clamp-2">
                                        {event.description}
                                    </CardDescription>
                                    {event.parameters && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {event.parameters.difficulty && (
                                                <Badge variant="outline" className="text-xs">
                                                    Difficulty: {event.parameters.difficulty}/5
                                                </Badge>
                                            )}
                                            {event.parameters.resource_impact && (
                                                <Badge variant="outline" className="text-xs">
                                                    Impact: {event.parameters.resource_impact}
                                                </Badge>
                                            )}
                                            {event.parameters.collaboration_required && (
                                                <Badge variant="outline" className="text-xs text-blue-400">
                                                    Team effort
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/60 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Participants
                                            </span>
                                            <span className="text-white">{event.involved_agents?.length || 0}</span>
                                        </div>
                                        
                                        {event.status === 'concluded' && event.outcomes && (
                                            <div className="pt-3 border-t border-white/10 space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-white/60">Collective Score</span>
                                                    <span className="text-green-400 font-medium">
                                                        {event.outcomes.collective_score}/100
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/60 line-clamp-2">
                                                    {event.outcomes.outcome_summary}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-3">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="flex-1 text-white/80 border-white/20"
                                                onClick={() => setSelectedEvent(event)}
                                            >
                                                View Details
                                            </Button>
                                            {event.status === 'active' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={() => concludeMutation.mutate(event.id)}
                                                    disabled={concludeMutation.isPending}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Conclude
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {events.length === 0 && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardContent className="py-12 text-center">
                            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                            <p className="text-white/60">No simulated events yet. Create your first training scenario!</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Event Details Modal */}
            {selectedEvent && (
                <EventDetailsModal 
                    event={selectedEvent}
                    decisions={decisions}
                    agents={agents}
                    onClose={() => setSelectedEvent(null)}
                    onAddParticipant={(agentId) => participateMutation.mutate({ 
                        event_id: selectedEvent.id, 
                        agent_id: agentId 
                    })}
                />
            )}
        </div>
    );
}

function CreateEventDialog({ agents, onSubmit, isLoading }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        event_type: 'resource_challenge',
        duration_ticks: 20,
        creator_agent_id: 'axi'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({
            name: '',
            event_type: 'resource_challenge',
            duration_ticks: 20,
            creator_agent_id: 'axi'
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                    <Beaker className="w-4 h-4 mr-2" />
                    Create Event
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Simulated Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4">
                        <p className="text-sm text-purple-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            AI will generate event description, objectives, and parameters based on your selections
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Event Name</label>
                        <Input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="bg-white/5 border-white/10"
                            placeholder="e.g., Resource Scarcity Crisis"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Event Type</label>
                            <Select value={formData.event_type} onValueChange={(val) => setFormData({...formData, event_type: val})}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="resource_challenge">Resource Challenge</SelectItem>
                                    <SelectItem value="discovery">Discovery</SelectItem>
                                    <SelectItem value="social_dilemma">Social Dilemma</SelectItem>
                                    <SelectItem value="governance_test">Governance Test</SelectItem>
                                    <SelectItem value="crisis_response">Crisis Response</SelectItem>
                                    <SelectItem value="collaboration_test">Collaboration Test</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-white/60 mb-2 block">Duration (ticks)</label>
                            <Input 
                                type="number"
                                value={formData.duration_ticks}
                                onChange={(e) => setFormData({...formData, duration_ticks: parseInt(e.target.value)})}
                                className="bg-white/5 border-white/10"
                                min="5"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Creator Agent</label>
                        <Select value={formData.creator_agent_id} onValueChange={(val) => setFormData({...formData, creator_agent_id: val})}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.filter(a => a.permissions?.can_evaluate_agents).map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600" disabled={isLoading}>
                        {isLoading ? 'AI Generating...' : '✨ Create with AI'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EventDetailsModal({ event, decisions, agents, onClose, onAddParticipant }) {
    const [selectedAgent, setSelectedAgent] = useState('');

    const participantAgents = agents.filter(a => event.involved_agents?.includes(a.id));
    const availableAgents = agents.filter(a => !event.involved_agents?.includes(a.id));

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{event.name}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm text-white/60 mb-2">Description</h3>
                        <p className="text-white/80 whitespace-pre-wrap">{event.description}</p>
                    </div>

                    {event.parameters && Object.keys(event.parameters).length > 0 && (
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h3 className="text-sm text-blue-300 mb-3">AI-Generated Parameters</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {event.parameters.difficulty && (
                                    <div>
                                        <p className="text-xs text-white/60">Difficulty</p>
                                        <p className="text-white">{event.parameters.difficulty}/5</p>
                                    </div>
                                )}
                                {event.parameters.resource_impact && (
                                    <div>
                                        <p className="text-xs text-white/60">Resource Impact</p>
                                        <p className="text-white capitalize">{event.parameters.resource_impact}</p>
                                    </div>
                                )}
                                {event.parameters.collaboration_required !== undefined && (
                                    <div>
                                        <p className="text-xs text-white/60">Collaboration</p>
                                        <p className="text-white">{event.parameters.collaboration_required ? 'Required' : 'Optional'}</p>
                                    </div>
                                )}
                                {event.parameters.success_criteria && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-white/60 mb-1">Success Criteria</p>
                                        <p className="text-sm text-white/80">{event.parameters.success_criteria}</p>
                                    </div>
                                )}
                                {event.parameters.ethical_dilemma && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-white/60 mb-1">Ethical Dilemma</p>
                                        <p className="text-sm text-white/80">{event.parameters.ethical_dilemma}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <h3 className="text-sm text-white/60 mb-1">Type</h3>
                            <Badge variant="outline">{event.event_type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div>
                            <h3 className="text-sm text-white/60 mb-1">Status</h3>
                            <Badge variant="outline">{event.status}</Badge>
                        </div>
                        <div>
                            <h3 className="text-sm text-white/60 mb-1">Duration</h3>
                            <p className="text-white">{event.end_tick - event.start_tick} ticks</p>
                        </div>
                    </div>

                    {event.status === 'active' && availableAgents.length > 0 && (
                        <div>
                            <h3 className="text-sm text-white/60 mb-2">Add Participant</h3>
                            <div className="flex gap-2">
                                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                    <SelectTrigger className="bg-white/5 border-white/10 flex-1">
                                        <SelectValue placeholder="Select agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableAgents.map(agent => (
                                            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button 
                                    onClick={() => {
                                        if (selectedAgent) {
                                            onAddParticipant(selectedAgent);
                                            setSelectedAgent('');
                                        }
                                    }}
                                    disabled={!selectedAgent}
                                >
                                    Add
                                </Button>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm text-white/60 mb-3">Participants ({participantAgents.length})</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {participantAgents.map(agent => (
                                <div key={agent.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                    <p className="text-white font-medium">{agent.name}</p>
                                    <p className="text-xs text-white/60">{agent.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {event.status === 'active' && participantAgents.length > 0 && (
                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-sm text-white/60 mb-3">AI Decision Points</h3>
                            <div className="space-y-3">
                                {participantAgents.slice(0, 2).map(agent => (
                                    <div key={agent.id}>
                                        <p className="text-xs text-white/60 mb-2">{agent.name}</p>
                                        <EventDecisionPoint 
                                            event={event}
                                            agent={agent}
                                            onDecisionMade={() => {}}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {decisions.length > 0 && (
                        <div>
                            <h3 className="text-sm text-white/60 mb-3">Decisions Made ({decisions.length})</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {decisions.map((decision, idx) => {
                                    const agent = agents.find(a => a.id === decision.agent_id);
                                    return (
                                        <div key={decision.id || idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-white font-medium">{agent?.name || 'Unknown'}</span>
                                                {decision.consequence?.impact_score && (
                                                    <Badge variant={decision.consequence.impact_score > 0 ? 'default' : 'destructive'}>
                                                        Impact: {decision.consequence.impact_score > 0 ? '+' : ''}{decision.consequence.impact_score}
                                                    </Badge>
                                                )}
                                            </div>
                                            {decision.consequence?.consequence_description && (
                                                <p className="text-xs text-white/60">{decision.consequence.consequence_description}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {event.status === 'concluded' && event.outcomes && (
                        <>
                            {/* Narrative Chronicle */}
                            {event.outcomes.narrative && (
                                <div className="mb-4">
                                    <EventNarrativeCard event={event} />
                                </div>
                            )}

                            {/* Outcome Summary */}
                            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <h3 className="text-lg text-blue-300 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Final Outcomes
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-white/60 mb-1">Overall Result</p>
                                        <p className="text-white">{event.outcomes.outcome_summary}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/60 mb-1">Collective Score</p>
                                        <p className="text-2xl text-green-400 font-light">{event.outcomes.collective_score}/100</p>
                                    </div>
                                    {event.outcomes.lessons_learned?.length > 0 && (
                                        <div>
                                            <p className="text-sm text-white/60 mb-2">Lessons Learned</p>
                                            <ul className="space-y-1">
                                                {event.outcomes.lessons_learned.map((lesson, idx) => (
                                                    <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                                                        <span className="text-purple-400">•</span>
                                                        {lesson}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}