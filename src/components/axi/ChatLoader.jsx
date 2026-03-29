import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function ChatLoader() {

  useEffect(() => {
    const unsubscribe = base44.entities.JukeboxDecision.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const { id, action, agent_id, message, conversation_id } = event.data;

        // Only handle open_chat actions
        if (action === 'open_chat' && agent_id === 'axi') {
          window.dispatchEvent(new CustomEvent('open-axi-with-message', {
            detail: { message, conversationId: conversation_id, agentId: agent_id }
          }));

          base44.entities.JukeboxDecision.update(id, { status: 'processed' }).catch((error) => {
            console.error('Failed to update JukeboxDecision status:', error);
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}