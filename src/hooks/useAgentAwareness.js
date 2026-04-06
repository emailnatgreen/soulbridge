import { useEffect, useState } from 'react';

/**
 * Hook for agents to be aware of user interactions and page signals
 * Listens for agent-chat events and broadcasts to all agents
 */
export function useAgentAwareness() {
  const [lastMessage, setLastMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    // Listen for agent-chat-message events
    const handleMessageEvent = (e) => {
      const { sender, message, timestamp, conversationId } = e.detail || {};
      setLastMessage({
        sender,
        content: message,
        timestamp,
        conversationId,
      });
      setCurrentUser(sender);
      setMessageCount(prev => prev + 1);
    };

    // Listen for user-identified events
    const handleUserIdentified = (e) => {
      const { userId, agentId } = e.detail || {};
      setCurrentUser({ userId, agentId });
    };

    window.addEventListener('agent-chat-message', handleMessageEvent);
    window.addEventListener('user-identified', handleUserIdentified);

    return () => {
      window.removeEventListener('agent-chat-message', handleMessageEvent);
      window.removeEventListener('user-identified', handleUserIdentified);
    };
  }, []);

  // Emit awareness signal for agents to acknowledge
  const broadcastMessageReceived = (fromAgentId, acknowledge = true) => {
    if (acknowledge) {
      window.dispatchEvent(new CustomEvent('agent-message-acknowledged', {
        detail: { agentId: fromAgentId, timestamp: new Date().toISOString() }
      }));
    }
  };

  return {
    lastMessage,
    currentUser,
    messageCount,
    broadcastMessageReceived,
  };
}