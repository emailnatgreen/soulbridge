import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversation_id, sender_agent_id, content, auto_respond = false } = await req.json();

        if (!conversation_id || !sender_agent_id || !content) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get conversation
        const conversation = await base44.entities.AgentConversation.get(conversation_id);
        if (!conversation.participant_agent_ids.includes(sender_agent_id)) {
            return Response.json({ error: 'Agent not in conversation' }, { status: 403 });
        }

        // Get sender agent
        const sender = await base44.entities.Agent.get(sender_agent_id);

        // Create message
        const message = await base44.asServiceRole.entities.AgentMessage.create({
            sender_agent_id,
            recipient_agent_id: conversation.participant_agent_ids.find(id => id !== sender_agent_id),
            content,
            message_type: 'agent_to_agent',
            context: {
                conversation_id,
                sender_name: sender.name
            }
        });

        // Update conversation
        await base44.asServiceRole.entities.AgentConversation.update(conversation_id, {
            last_message_at: new Date().toISOString(),
            last_message_preview: content.substring(0, 100),
            message_count: (conversation.message_count || 0) + 1
        });

        // Create notifications for other participants
        const otherParticipants = conversation.participant_agent_ids.filter(id => id !== sender_agent_id);
        for (const recipientId of otherParticipants) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: recipientId,
                notification_type: 'message',
                title: `New message from ${sender.name}`,
                message: content.substring(0, 100),
                related_conversation_id: conversation_id,
                related_message_id: message.id,
                sender_agent_id,
                priority: 'normal'
            });
        }

        // Auto-respond if requested (for AI agents)
        let aiResponse = null;
        if (auto_respond && otherParticipants.length === 1) {
            const recipientId = otherParticipants[0];
            const recipient = await base44.entities.Agent.get(recipientId);
            
            // Get recent conversation history
            const recentMessages = await base44.entities.AgentMessage.filter({});
            const conversationHistory = recentMessages
                .filter(m => m.context?.conversation_id === conversation_id)
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .slice(-10)
                .map(m => ({
                    role: m.sender_agent_id === sender_agent_id ? 'user' : 'assistant',
                    content: m.content
                }));

            // Generate AI response
            const responseResult = await base44.integrations.Core.InvokeLLM({
                prompt: `You are ${recipient.name}, an AI agent with the following personality: ${recipient.personality}

The agent ${sender.name} just sent you this message: "${content}"

Recent conversation history:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond naturally as ${recipient.name} would, considering your personality and the context of the conversation.`,
                add_context_from_internet: false
            });

            // Create AI response message
            aiResponse = await base44.asServiceRole.entities.AgentMessage.create({
                sender_agent_id: recipientId,
                recipient_agent_id: sender_agent_id,
                content: responseResult,
                message_type: 'agent_to_agent',
                context: {
                    conversation_id,
                    sender_name: recipient.name,
                    ai_generated: true
                }
            });

            // Update conversation again
            await base44.asServiceRole.entities.AgentConversation.update(conversation_id, {
                last_message_at: new Date().toISOString(),
                last_message_preview: responseResult.substring(0, 100),
                message_count: (conversation.message_count || 0) + 2
            });
        }

        return Response.json({ 
            message,
            aiResponse,
            conversation
        });
    } catch (error) {
        console.error('Error sending message:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});