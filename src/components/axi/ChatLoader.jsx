import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ChatLoader() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = base44.entities.JukeboxDecision.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const { id, action, agent_id, message, conversation_id } = event.data;

        // Only handle open_chat actions
        if (action === 'open_chat' && agent_id === 'axi') {
          // Dispatch custom event to open Axi Chat with pre-filled message
          window.dispatchEvent(new CustomEvent('open-axi-with-message', {
            detail: { message, conversationId: conversation_id }
          }));

          // Mark the decision as processed
          base44.asServiceRole.entities.JukeboxDecision.update(id, { status: 'processed' })
            .catch(error => {
              console.error('Failed to update JukeboxDecision status:', error);
              base44.asServiceRole.entities.JukeboxDecision.update(id, { status: 'failed' }).catch(() => {});
            });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return null;
}