import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * AskAxiButton - opens Axi floating chat pre-seeded with a context message
 * Usage: <AskAxiButton context="You are viewing Agent Performance Analytics for agent Epoch Architect..." />
 */
export default function AskAxiButton({ context, label = "Ask Axi", className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Create a conversation with context pre-loaded
      const convo = await base44.agents.createConversation({
        agent_name: 'axi',
        metadata: {
          name: label,
          context_page: window.location.pathname,
          prefilled_context: context
        }
      });

      // Send the context as a system-style user message
      if (context) {
        await base44.agents.addMessage(convo, {
          role: 'user',
          content: context
        });
      }

      // Dispatch custom event to open AxiFloatingButton with this conversation
      window.dispatchEvent(new CustomEvent('axi:open-conversation', {
        detail: { conversationId: convo.id }
      }));
    } catch (e) {
      console.error('AskAxi error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      size="sm"
      className={`border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 hover:border-purple-400/50 ${className}`}
    >
      {loading
        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        : <Sparkles className="w-4 h-4 mr-2" />}
      {label}
    </Button>
  );
}