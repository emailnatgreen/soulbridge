import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function AgentMessaging({ currentAgent }) {
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [message, setMessage] = useState('');
    const queryClient = useQueryClient();

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
    });

    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['agent-messages', currentAgent.id],
        queryFn: async () => {
            const sent = await base44.entities.AgentMessage.filter({
                from_agent_id: currentAgent.id
            }, '-created_date', 100);
            const received = await base44.entities.AgentMessage.filter({
                to_agent_id: currentAgent.id
            }, '-created_date', 100);
            return [...sent, ...received].sort((a, b) => 
                new Date(b.created_date) - new Date(a.created_date)
            );
        },
        refetchInterval: 5000,
    });

    const sendMessageMutation = useMutation({
        mutationFn: async ({ to_agent_id, message }) => {
            const response = await base44.functions.invoke('sendAgentMessage', {
                from_agent_id: currentAgent.id,
                to_agent_id,
                message
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['agent-messages']);
            toast.success('Message sent and response received');
            setMessage('');
            setSelectedAgentId('');
        },
        onError: (error) => {
            toast.error('Failed to send message: ' + error.message);
        }
    });

    const handleSendMessage = () => {
        if (!selectedAgentId || !message.trim()) {
            toast.error('Please select an agent and enter a message');
            return;
        }
        sendMessageMutation.mutate({ to_agent_id: selectedAgentId, message: message.trim() });
    };

    const otherAgents = agents.filter(a => a.id !== currentAgent.id);

    return (
        <div className="space-y-6">
            {/* Send Message Card */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-purple-400" />
                        Send Message
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">To Agent</label>
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select an agent..." />
                            </SelectTrigger>
                            <SelectContent>
                                {otherAgents.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                        {agent.name} - {agent.role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Message</label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="What would you like to say?"
                            className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        />
                    </div>
                    <Button
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        {sendMessageMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending & awaiting response...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Message
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Message History */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        Message History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-white/5 rounded-lg h-24" />
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/40">No messages yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map(msg => {
                                const isSent = msg.from_agent_id === currentAgent.id;
                                const otherAgentName = isSent 
                                    ? msg.metadata?.to_agent_name 
                                    : msg.metadata?.from_agent_name;

                                return (
                                    <div 
                                        key={msg.id}
                                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <User className={`w-4 h-4 ${isSent ? 'text-blue-400' : 'text-green-400'}`} />
                                                <span className="text-sm font-medium text-white">
                                                    {isSent ? 'Sent to' : 'Received from'} {otherAgentName}
                                                </span>
                                            </div>
                                            <span className="text-xs text-white/40">
                                                {moment(msg.created_date).fromNow()}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                                                <p className="text-xs text-blue-300/60 mb-1">
                                                    {isSent ? 'Your message' : 'Their message'}
                                                </p>
                                                <p className="text-white/90 text-sm">{msg.message}</p>
                                            </div>
                                            
                                            {msg.response && (
                                                <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                                                    <p className="text-xs text-green-300/60 mb-1">
                                                        {isSent ? 'Their response' : 'Your response'}
                                                    </p>
                                                    <p className="text-white/90 text-sm">{msg.response}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}