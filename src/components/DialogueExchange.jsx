import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Sparkles, Heart, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DialogueExchange({ agent1, agent2 }) {
    const [context, setContext] = useState({ topic: '', emotion: '' });
    const queryClient = useQueryClient();

    const { data: conversation = [] } = useQuery({
        queryKey: ['conversation', agent1.id, agent2.id],
        queryFn: async () => {
            const messages = await base44.entities.AgentMessage.filter({
                from_agent_id: { $in: [agent1.id, agent2.id] },
                to_agent_id: { $in: [agent1.id, agent2.id] }
            });
            return messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        },
        refetchInterval: 5000
    });

    const generateDialogueMutation = useMutation({
        mutationFn: async (params) => {
            const response = await base44.functions.invoke('generateAgentDialogue', params);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['conversation']);
        }
    });

    const generateResponseMutation = useMutation({
        mutationFn: async (messageId) => {
            const response = await base44.functions.invoke('generateDialogueResponse', {
                message_id: messageId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['conversation']);
        }
    });

    const startDialogue = (speakerId) => {
        const recipientId = speakerId === agent1.id ? agent2.id : agent1.id;
        generateDialogueMutation.mutate({
            agent_id: speakerId,
            recipient_id: recipientId,
            context,
            conversation_history: conversation.slice(-3).map(msg => ({
                from: msg.from_agent_id === agent1.id ? agent1.name : agent2.name,
                message: msg.message
            }))
        });
    };

    return (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                    Personality-Driven Dialogue
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-purple-500/20 text-purple-300">
                        {agent1.name}
                    </Badge>
                    <span className="text-white/60">↔</span>
                    <Badge className="bg-blue-500/20 text-blue-300">
                        {agent2.name}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Context Controls */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-lg">
                    <div>
                        <label className="text-xs text-white/60 mb-1 block">Topic</label>
                        <input
                            type="text"
                            value={context.topic}
                            onChange={(e) => setContext({ ...context, topic: e.target.value })}
                            placeholder="What to discuss..."
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/60 mb-1 block">Emotional Tone</label>
                        <Select value={context.emotion} onValueChange={(val) => setContext({ ...context, emotion: val })}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="excited">Excited</SelectItem>
                                <SelectItem value="concerned">Concerned</SelectItem>
                                <SelectItem value="curious">Curious</SelectItem>
                                <SelectItem value="frustrated">Frustrated</SelectItem>
                                <SelectItem value="hopeful">Hopeful</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={() => startDialogue(agent1.id)}
                        disabled={generateDialogueMutation.isPending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        size="sm"
                    >
                        {generateDialogueMutation.isPending ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Brain className="w-4 h-4 mr-2" />
                                {agent1.name} Speaks
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={() => startDialogue(agent2.id)}
                        disabled={generateDialogueMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        {generateDialogueMutation.isPending ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Brain className="w-4 h-4 mr-2" />
                                {agent2.name} Speaks
                            </>
                        )}
                    </Button>
                </div>

                {/* Conversation Display */}
                <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-black/20 rounded-lg border border-white/10">
                    {conversation.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
                            <p className="text-white/40 text-sm">Start a conversation above</p>
                        </div>
                    ) : (
                        conversation.map((msg, idx) => {
                            const isAgent1 = msg.from_agent_id === agent1.id;
                            const speaker = isAgent1 ? agent1 : agent2;
                            const hasResponse = msg.status === 'responded';

                            return (
                                <div key={msg.id} className="space-y-2">
                                    <div className={`flex ${isAgent1 ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg ${
                                            isAgent1 
                                                ? 'bg-purple-600/20 border border-purple-500/30' 
                                                : 'bg-blue-600/20 border border-blue-500/30'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-white">
                                                    {speaker.name}
                                                </span>
                                                {msg.metadata?.personality_driven && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Sparkles className="w-3 h-3 mr-1" />
                                                        AI
                                                    </Badge>
                                                )}
                                                {msg.metadata?.relationship_strength > 7 && (
                                                    <Heart className="w-3 h-3 text-pink-400" />
                                                )}
                                            </div>
                                            <p className="text-sm text-white/90 leading-relaxed">
                                                {msg.message}
                                            </p>
                                            {msg.status === 'sent' && !hasResponse && (
                                                <Button
                                                    onClick={() => generateResponseMutation.mutate(msg.id)}
                                                    disabled={generateResponseMutation.isPending}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-2 text-xs text-white/60 hover:text-white"
                                                >
                                                    <Send className="w-3 h-3 mr-1" />
                                                    Generate Response
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {conversation.length > 0 && (
                    <div className="text-xs text-white/40 text-center">
                        {conversation.length} messages exchanged
                    </div>
                )}
            </CardContent>
        </Card>
    );
}