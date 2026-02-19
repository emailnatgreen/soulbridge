import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { participant_agent_ids, title, conversation_type = 'direct' } = await req.json();

        if (!participant_agent_ids || participant_agent_ids.length < 2) {
            return Response.json({ error: 'At least 2 participants required' }, { status: 400 });
        }

        // Check if direct conversation already exists
        if (conversation_type === 'direct' && participant_agent_ids.length === 2) {
            const existingConvos = await base44.entities.AgentConversation.filter({
                conversation_type: 'direct'
            });

            const existing = existingConvos.find(c => 
                c.participant_agent_ids.length === 2 &&
                c.participant_agent_ids.includes(participant_agent_ids[0]) &&
                c.participant_agent_ids.includes(participant_agent_ids[1])
            );

            if (existing) {
                return Response.json({ conversation: existing, existed: true });
            }
        }

        // Fetch agent names for title
        const agents = await Promise.all(
            participant_agent_ids.map(id => base44.entities.Agent.get(id))
        );
        const agentNames = agents.map(a => a.name);

        const conversationTitle = title || (
            conversation_type === 'direct' 
                ? `${agentNames[0]} & ${agentNames[1]}`
                : `Group: ${agentNames.slice(0, 3).join(', ')}${agentNames.length > 3 ? '...' : ''}`
        );

        const conversation = await base44.asServiceRole.entities.AgentConversation.create({
            title: conversationTitle,
            conversation_type,
            participant_agent_ids,
            last_message_at: new Date().toISOString(),
            message_count: 0,
            is_active: true
        });

        // Create notifications for all participants
        for (const agentId of participant_agent_ids) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agentId,
                notification_type: 'conversation_invite',
                title: 'New Conversation',
                message: `You've been added to: ${conversationTitle}`,
                related_conversation_id: conversation.id,
                priority: 'normal'
            });
        }

        return Response.json({ conversation, existed: false });
    } catch (error) {
        console.error('Error starting conversation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});