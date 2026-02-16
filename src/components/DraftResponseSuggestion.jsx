import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, Edit2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function DraftResponseSuggestion({ messageId, agentId, agentName, onSend, onDismiss }) {
    const [draft, setDraft] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState('');

    useEffect(() => {
        const generateDraft = async () => {
            try {
                const response = await base44.functions.invoke('generateDraftResponse', {
                    message_id: messageId,
                    agent_id: agentId
                });
                setDraft(response.data.draft_response);
                setEditedText(response.data.draft_response);
            } catch (error) {
                toast.error('Failed to generate draft response');
                onDismiss();
            } finally {
                setIsLoading(false);
            }
        };

        generateDraft();
    }, [messageId, agentId, onDismiss]);

    const handleSend = () => {
        const finalText = isEditing ? editedText : draft;
        if (!finalText.trim()) {
            toast.error('Cannot send empty response');
            return;
        }
        onSend(finalText);
    };

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 p-4 mb-4">
                <div className="flex items-center gap-2 text-white/60">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating AI draft response...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 p-4 mb-4">
            <div className="space-y-3">
                <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-purple-300/60 font-semibold mb-2">AI DRAFT SUGGESTION</p>
                        {isEditing ? (
                            <Textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="bg-white/5 border-purple-500/30 text-white text-sm min-h-[60px]"
                            />
                        ) : (
                            <p className="text-sm text-white/80">{draft}</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <Edit2 className="w-3 h-3 mr-1" />
                        {isEditing ? 'Done Editing' : 'Edit'}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSend}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                        <Check className="w-3 h-3 mr-1" />
                        Send
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDismiss}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Dismiss
                    </Button>
                </div>
            </div>
        </Card>
    );
}