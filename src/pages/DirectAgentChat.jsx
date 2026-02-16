import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Send, Loader2, MessageCircle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

export default function DirectAgentChat() {
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [groupMessages, setGroupMessages] = useState([]);
    const [chatMode, setChatMode] = useState('direct');
    const scrollRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list(),
    });

    const { data: conversations = [], refetch: refetchConversations } = useQuery({
        queryKey: ['agent-conversations', selectedAgentId],
        queryFn: async () => {
            if (!selectedAgentId) return [];
            const messages = await base44.entities.AgentMessage.list('-created_date', 100);
            return messages.filter(m => (m.from_agent_id === 'user' && m.to_agent_id === selectedAgentId) || (m.from_agent_id === selectedAgentId && m.to_agent_id === 'user'));
        },
        enabled: !!selectedAgentId,
        refetchInterval: 2000,
    });

    const { data: groupMessages: allGroupMessages = [] } = useQuery({
        queryKey: ['group-messages'],
        queryFn: async () => {
            const messages = await base44.entities.AgentMessage.list('-created_date', 200);
            return messages.filter(m => m.from_agent_id === 'the-oldman' || m.to_agent_id === 'the-oldman').sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        },
        refetchInterval: 2000,
    });

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    const sendMessageMutation = useMutation({
        mutationFn: async (message) => {
            const newMessage = await base44.entities.AgentMessage.create({
                from_agent_id: 'user',
                to_agent_id: selectedAgentId,
                message: message,
                status: 'sent'
            });
            // Forward to Axi (Mother Boss) for centralized oversight
            await base44.entities.AgentMessage.create({
                from_agent_id: 'user',
                to_agent_id: '6993271e7dc0fa2ab78762bf',
                message: `[From: User to ${selectedAgent?.name}] ${message}`,
                status: 'sent'
            });
            // Generate response from agent
            await base44.functions.invoke('generateAgentResponse', {
                message_id: newMessage.id
            });
            return newMessage;
        },
        onSuccess: () => {
            setMessageInput('');
            queryClient.invalidateQueries({ queryKey: ['agent-conversations', selectedAgentId] });
            toast.success('Message sent');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to send message');
        }
    });

    const sendGroupMessageMutation = useMutation({
        mutationFn: async (message) => {
            const messages = [];
            // Send message from "the oldman" to all agents
            for (const agent of agents) {
                const msg = await base44.entities.AgentMessage.create({
                    from_agent_id: 'the-oldman',
                    to_agent_id: agent.id,
                    message: message,
                    status: 'sent'
                });
                messages.push(msg);
                // Generate response
                await base44.functions.invoke('generateAgentResponse', {
                    message_id: msg.id
                });
            }
            // Also notify Axi
            await base44.entities.AgentMessage.create({
                from_agent_id: 'the-oldman',
                to_agent_id: '6993271e7dc0fa2ab78762bf',
                message: `[Village Meetup] ${message}`,
                status: 'sent'
            });
            return messages;
        },
        onSuccess: () => {
            setMessageInput('');
            queryClient.invalidateQueries({ queryKey: ['group-messages'] });
            toast.success('Message sent to all agents');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to send message');
        }
    });

    const generateResponseMutation = useMutation({
        mutationFn: async (messageId) => {
            const response = await base44.functions.invoke('generateAgentResponse', {
                message_id: messageId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-conversations', selectedAgentId] });
            toast.success('Agent responded');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to generate response');
        }
    });

    const handleSend = () => {
        if (!messageInput.trim()) return;
        sendMessageMutation.mutate(messageInput);
    };

    const handleGenerateResponse = (messageId) => {
        generateResponseMutation.mutate(messageId);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversations]);

    const userMessages = conversations?.filter(m => m.from_agent_id === 'user') || [];
    const agentMessages = conversations?.filter(m => m.to_agent_id === 'user') || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-white">Agent Chat</h1>
                            <p className="text-sm text-purple-300/60">Direct one-on-one conversations with agents</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <Tabs value={chatMode} onValueChange={setChatMode} className="w-full">
                    <TabsList className="bg-white/10 border-white/10">
                        <TabsTrigger value="direct" className="text-white">Direct Messages</TabsTrigger>
                        <TabsTrigger value="meetup" className="text-white"><Users className="w-4 h-4 mr-2" />Village Meetup</TabsTrigger>
                    </TabsList>

                    <TabsContent value="direct" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Agent List */}
                            <div>
                        <h2 className="text-lg font-light text-white mb-4">Agents</h2>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-2">
                                {agents.map(agent => (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            setSelectedAgentId(agent.id);
                                            setMessageInput('');
                                        }}
                                        className={`w-full p-4 rounded-lg border transition-all text-left ${
                                            selectedAgentId === agent.id
                                                ? 'bg-purple-500/20 border-purple-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <p className="text-white font-medium">{agent.name}</p>
                                        <p className="text-xs text-white/60 capitalize">{agent.role}</p>
                                        <p className="text-xs text-white/40 mt-1 truncate">{agent.purpose}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Chat Area */}
                    <div className="lg:col-span-2">
                        {selectedAgent ? (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-[600px] flex flex-col">
                                <CardHeader className="border-b border-white/10">
                                    <CardTitle className="text-white">{selectedAgent.name}</CardTitle>
                                    <p className="text-sm text-white/60 mt-2">{selectedAgent.purpose}</p>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden p-4 flex flex-col">
                                    <ScrollArea className="flex-1 mb-4">
                                        <div className="space-y-4">
                                            {conversations && conversations.length === 0 ? (
                                                <div className="text-center py-8">
                                                    <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                                                    <p className="text-white/40">No messages yet. Start a conversation!</p>
                                                </div>
                                            ) : (
                                                conversations?.map(msg => (
                                                    <div key={msg.id} className={`flex ${msg.from_agent_id === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-xs rounded-lg p-3 ${
                                                            msg.from_agent_id === 'user'
                                                                ? 'bg-purple-600/40 text-white'
                                                                : 'bg-white/10 text-white/90'
                                                        }`}>
                                                            <p className="text-sm">{msg.message}</p>
                                                            {msg.response && (
                                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                                    <p className="text-xs text-white/80 font-medium mb-1">Agent Response:</p>
                                                                    <p className="text-sm">{msg.response}</p>
                                                                </div>
                                                            )}
                                                            {!msg.response && msg.from_agent_id === 'user' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="mt-2 text-xs h-6 text-white/60 hover:text-white"
                                                                    onClick={() => handleGenerateResponse(msg.id)}
                                                                    disabled={generateResponseMutation.isPending}
                                                                >
                                                                    {generateResponseMutation.isPending ? (
                                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                    ) : null}
                                                                    Get Response
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <div ref={scrollRef} />
                                        </div>
                                    </ScrollArea>

                                    {/* Input Area */}
                                    <div className="flex gap-2">
                                        <Textarea
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.ctrlKey) {
                                                    handleSend();
                                                }
                                            }}
                                            placeholder="Type your message... (Ctrl+Enter to send)"
                                            className="bg-white/5 border-white/10 text-white min-h-[60px]"
                                        />
                                        <Button
                                            onClick={handleSend}
                                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 self-end"
                                        >
                                            {sendMessageMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-[600px] flex items-center justify-center">
                                <div className="text-center">
                                    <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/40">Select an agent to start chatting</p>
                                </div>
                            </Card>
                        )}
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="meetup" className="mt-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-[600px] flex flex-col">
                            <CardHeader className="border-b border-white/10">
                                <CardTitle className="text-white">Village Meetup - The Oldman</CardTitle>
                                <p className="text-sm text-white/60 mt-2">Free and open dialogue with all agents</p>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-4 flex flex-col">
                                <ScrollArea className="flex-1 mb-4">
                                    <div className="space-y-4">
                                        {allGroupMessages && allGroupMessages.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                                                <p className="text-white/40">Start a village conversation!</p>
                                            </div>
                                        ) : (
                                            allGroupMessages?.map(msg => {
                                                const sender = agents.find(a => a.id === msg.from_agent_id) || (msg.from_agent_id === 'the-oldman' ? { name: 'the oldman' } : { name: 'Unknown' });
                                                return (
                                                    <div key={msg.id} className={`flex ${msg.from_agent_id === 'the-oldman' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-xs rounded-lg p-3 ${
                                                            msg.from_agent_id === 'the-oldman'
                                                                ? 'bg-purple-600/40 text-white'
                                                                : 'bg-white/10 text-white/90'
                                                        }`}>
                                                            <p className="text-xs font-semibold text-white/70 mb-1">{sender.name}</p>
                                                            <p className="text-sm">{msg.message}</p>
                                                            {msg.response && (
                                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                                    <p className="text-xs text-white/80 font-medium mb-1">Response:</p>
                                                                    <p className="text-sm">{msg.response}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>

                                {/* Group Input Area */}
                                <div className="flex gap-2">
                                    <Textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                if (messageInput.trim()) {
                                                    sendGroupMessageMutation.mutate(messageInput);
                                                }
                                            }
                                        }}
                                        placeholder="Speak freely to the village... (Ctrl+Enter to send)"
                                        className="bg-white/5 border-white/10 text-white min-h-[60px]"
                                    />
                                    <Button
                                        onClick={() => {
                                            if (messageInput.trim()) {
                                                sendGroupMessageMutation.mutate(messageInput);
                                            }
                                        }}
                                        disabled={!messageInput.trim() || sendGroupMessageMutation.isPending}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 self-end"
                                    >
                                        {sendGroupMessageMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}