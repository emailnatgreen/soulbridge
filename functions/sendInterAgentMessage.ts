import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversation_id, sender_agent_id, content, message_type = 'text', related_task_id, auto_respond = false } = await req.json();

        if (!conversation_id || !sender_agent_id || !content) {
            return Response.json({ 
                error: 'conversation_id, sender_agent_id, and content are required' 
            }, { status: 400 });
        }

        // Get conversation and sender
        const conversation = await base44.entities.AgentConversation.get(conversation_id);
        const sender = await base44.asServiceRole.entities.Agent.get(sender_agent_id);

        if (!conversation || !sender) {
            return Response.json({ error: 'Conversation or sender not found' }, { status: 404 });
        }

        // Create message
        const message = await base44.entities.AgentMessage.create({
            conversation_id,
            sender_agent_id,
            content,
            message_type,
            related_task_id: related_task_id || null,
            related_project_id: conversation.project_id || null,
            status: 'sent',
            read_by: [sender_agent_id],
            context: {
                conversation_id,
                sender_name: sender.name,
                conversation_type: conversation.conversation_type
            }
        });

        // Update conversation
        await base44.entities.AgentConversation.update(conversation_id, {
            last_message_at: new Date().toISOString(),
            last_message_preview: content.substring(0, 100),
            message_count: (conversation.message_count || 0) + 1
        });

        // Notify other participants
        const otherParticipants = conversation.participant_agent_ids.filter(id => id !== sender_agent_id);
        for (const agentId of otherParticipants) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agentId,
                notification_type: 'message',
                title: `New message from ${sender.name}`,
                message: content.substring(0, 100),
                action_url: `/agent-messaging?conversation=${conversation_id}`,
                sender_agent_id,
                related_entity_type: 'AgentConversation',
                related_entity_id: conversation_id,
                priority: 'normal',
                metadata: {
                    conversation_id,
                    message_id: message.id
                }
            });
        }

        // Auto-respond if requested (for direct conversations)
        if (auto_respond && conversation.conversation_type === 'direct' && otherParticipants.length === 1) {
            const recipient = await base44.asServiceRole.entities.Agent.get(otherParticipants[0]);
            
            const responseText = await base44.integrations.Core.InvokeLLM({
                prompt: `You are ${recipient.name}, an AI agent with the following characteristics:
Purpose: ${recipient.purpose}
Personality: ${recipient.personality}
Role: ${recipient.role}

${sender.name} sent you this message:
"${content}"

Respond as ${recipient.name}, staying true to your purpose and personality. Keep it concise (2-3 sentences).`
            });

            // Create response message
            await base44.entities.AgentMessage.create({
                conversation_id,
                sender_agent_id: recipient.id,
                content: responseText,
                message_type: 'text',
                status: 'sent',
                read_by: [recipient.id],
                context: {
                    conversation_id,
                    sender_name: recipient.name,
                    ai_generated: true,
                    in_response_to: message.id
                }
            });

            // Update conversation again
            await base44.entities.AgentConversation.update(conversation_id, {
                last_message_at: new Date().toISOString(),
                last_message_preview: responseText.substring(0, 100),
                message_count: (conversation.message_count || 0) + 2
            });
        }

        return Response.json({
            success: true,
            message
        });

    } catch (error) {
        console.error('Error sending message:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});