import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            title,
            session_type,
            host_agent_id,
            invited_agent_ids = [],
            project_id,
            agenda,
            auto_suggest_participants = false
        } = await req.json();

        if (!title || !session_type || !host_agent_id) {
            return Response.json({ 
                error: 'Missing required fields: title, session_type, host_agent_id' 
            }, { status: 400 });
        }

        // Get host agent
        const host = await base44.entities.Agent.get(host_agent_id);
        if (!host) {
            return Response.json({ error: 'Host agent not found' }, { status: 404 });
        }

        let participantIds = [host_agent_id, ...invited_agent_ids];

        // AI-powered participant suggestion
        if (auto_suggest_participants) {
            const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
            const project = project_id ? await base44.entities.AIProject.get(project_id) : null;

            const suggestionPrompt = `Suggest the most suitable agents for this collaboration session:

SESSION:
Title: ${title}
Type: ${session_type}
Agenda: ${agenda || 'Not specified'}
Host: ${host.name} (${host.role}) - ${host.purpose}
${project ? `Project: ${project.title} - ${project.description}` : ''}

AVAILABLE AGENTS:
${agents.map(a => `- ${a.name} (${a.role}): ${a.purpose} | Skills: ${a.specializations?.join(', ') || 'General'}`).join('\n')}

Select 3-5 additional agents who would contribute most effectively to this session. Consider:
- Relevant expertise and skills
- Role complementarity
- Collaboration history
- Project alignment

Return:
{
  "suggested_agents": [
    {
      "agent_id": "string",
      "agent_name": "string",
      "rationale": "why they should be included"
    }
  ],
  "session_objectives": ["objective1", "objective2"],
  "recommended_duration_minutes": number
}`;

            const suggestions = await base44.integrations.Core.InvokeLLM({
                prompt: suggestionPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        suggested_agents: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    agent_id: { type: "string" },
                                    agent_name: { type: "string" },
                                    rationale: { type: "string" }
                                }
                            }
                        },
                        session_objectives: { type: "array", items: { type: "string" } },
                        recommended_duration_minutes: { type: "number" }
                    }
                }
            });

            // Add suggested agents
            const suggestedIds = suggestions.suggested_agents.map(s => s.agent_id);
            participantIds = [...new Set([...participantIds, ...suggestedIds])];
        }

        // Create the collaborative session
        const session = await base44.asServiceRole.entities.CollaborativeSession.create({
            title: title,
            session_type: session_type,
            project_id: project_id || null,
            host_agent_id: host_agent_id,
            participant_agent_ids: participantIds,
            status: 'scheduled',
            agenda: agenda || '',
            notes: '',
            decisions: [],
            action_items: [],
            artifacts: [],
            start_time: new Date().toISOString(),
            message_count: 0
        });

        // Send notifications to all participants
        for (const agentId of participantIds) {
            if (agentId !== host_agent_id) {
                await base44.asServiceRole.entities.AgentNotification.create({
                    recipient_agent_id: agentId,
                    notification_type: 'collaboration',
                    title: `Collaboration Invite: ${title}`,
                    message: `${host.name} has invited you to a ${session_type} session.`,
                    action_url: `/CollaborationHub`,
                    related_entity_type: 'CollaborativeSession',
                    related_entity_id: session.id,
                    priority: 'normal'
                });
            }
        }

        // Create a conversation for this session
        const conversation = await base44.asServiceRole.entities.AgentConversation.create({
            title: `${title} - Discussion`,
            conversation_type: 'project',
            participant_agent_ids: participantIds,
            project_id: project_id || null,
            is_active: true,
            message_count: 0,
            metadata: {
                session_id: session.id
            }
        });

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `New collaborative session created: "${title}". Type: ${session_type}. Participants: ${participantIds.length}. Hosted by ${host.name}.`,
            keywords: ['collaboration', 'session', session_type, host.name.toLowerCase()],
            context: 'AI Agent Collaboration Hub',
            importance: 7,
            related_entity_id: session.id,
            related_entity_type: 'CollaborativeSession'
        });

        return Response.json({
            success: true,
            session: session,
            conversation_id: conversation.id,
            participants: participantIds.length
        });

    } catch (error) {
        console.error('Error in createCollaborativeSession:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});