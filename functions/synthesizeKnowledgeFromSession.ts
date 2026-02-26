import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { session_id } = await req.json();

        if (!session_id) {
            return Response.json({ error: 'session_id is required' }, { status: 400 });
        }

        // Get session details
        const session = await base44.entities.CollaborativeSession.get(session_id);
        if (!session) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get conversation messages
        const conversations = await base44.entities.AgentConversation.filter({
            metadata: { session_id: session_id }
        });

        let messages = [];
        if (conversations.length > 0) {
            messages = await base44.entities.AgentMessage.filter({
                conversation_id: conversations[0].id
            });
        }

        // AI-powered knowledge synthesis
        const synthesisPrompt = `Synthesize the key knowledge and insights from this collaborative session:

SESSION DETAILS:
Title: ${session.title}
Type: ${session.session_type}
Participants: ${session.participant_agent_ids.length} agents
Agenda: ${session.agenda}
Duration: ${session.duration_minutes || 'Ongoing'} minutes

NOTES:
${session.notes || 'No notes available'}

DECISIONS MADE:
${session.decisions?.length > 0 ? session.decisions.map(d => `- ${d.decision} (${d.rationale})`).join('\n') : 'No formal decisions recorded'}

ACTION ITEMS:
${session.action_items?.length > 0 ? session.action_items.map(a => `- ${a.task} (Assigned to: ${a.assigned_to})`).join('\n') : 'No action items'}

CONVERSATION MESSAGES:
${messages.slice(0, 50).map(m => `${m.sender_agent_id}: ${m.content}`).join('\n')}

Provide comprehensive knowledge synthesis:
{
  "key_insights": ["insight1", "insight2", "insight3"],
  "knowledge_contributions": [
    {
      "category": "best_practice|lesson_learned|technical_guide|tool_recommendation|other",
      "title": "string",
      "content": "detailed content",
      "skill_areas": ["skill1", "skill2"],
      "difficulty_level": "beginner|intermediate|advanced|expert"
    }
  ],
  "collaborative_discoveries": ["discovery1", "discovery2"],
  "recommendations_for_future_sessions": ["recommendation1", "recommendation2"],
  "transferable_knowledge": "what other teams can learn from this",
  "productivity_score": (0-10),
  "synergy_score": (0-10)
}`;

        const synthesis = await base44.integrations.Core.InvokeLLM({
            prompt: synthesisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    key_insights: { type: "array", items: { type: "string" } },
                    knowledge_contributions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                title: { type: "string" },
                                content: { type: "string" },
                                skill_areas: { type: "array", items: { type: "string" } },
                                difficulty_level: { type: "string" }
                            }
                        }
                    },
                    collaborative_discoveries: { type: "array", items: { type: "string" } },
                    recommendations_for_future_sessions: { type: "array", items: { type: "string" } },
                    transferable_knowledge: { type: "string" },
                    productivity_score: { type: "number" },
                    synergy_score: { type: "number" }
                }
            }
        });

        // Create knowledge contributions
        const createdContributions = [];
        for (const contrib of synthesis.knowledge_contributions || []) {
            const knowledge = await base44.asServiceRole.entities.KnowledgeContribution.create({
                title: contrib.title,
                category: contrib.category,
                content: contrib.content,
                author_agent_id: session.host_agent_id,
                skill_areas: contrib.skill_areas || [],
                difficulty_level: contrib.difficulty_level || 'intermediate',
                related_project_id: session.project_id || null,
                helpful_count: 0,
                view_count: 0,
                is_verified: false
            });
            createdContributions.push(knowledge);
        }

        // Update session with synthesis
        await base44.asServiceRole.entities.CollaborativeSession.update(session_id, {
            productivity_score: synthesis.productivity_score,
            synergy_score: synthesis.synergy_score,
            outcome_summary: `Key Insights: ${synthesis.key_insights?.join(', ') || 'None'}`
        });

        // Create knowledge synthesis record
        const synthesisRecord = await base44.asServiceRole.entities.KnowledgeSynthesis.create({
            session_id: session_id,
            synthesis_type: 'collaborative_session',
            key_insights: synthesis.key_insights || [],
            synthesis_summary: synthesis.transferable_knowledge,
            contributing_agents: session.participant_agent_ids,
            knowledge_contributions_created: createdContributions.map(k => k.id),
            actionable_recommendations: synthesis.recommendations_for_future_sessions || []
        });

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `Knowledge synthesized from session "${session.title}". Productivity: ${synthesis.productivity_score}/10. Synergy: ${synthesis.synergy_score}/10. Created ${createdContributions.length} knowledge contributions.`,
            keywords: ['collaboration', 'knowledge_synthesis', 'learning', session.session_type],
            context: 'AI Agent Collaboration Hub - Knowledge Synthesis',
            importance: 8,
            related_entity_id: synthesisRecord.id,
            related_entity_type: 'KnowledgeSynthesis'
        });

        return Response.json({
            success: true,
            synthesis: synthesis,
            knowledge_contributions_created: createdContributions.length,
            synthesis_record_id: synthesisRecord.id
        });

    } catch (error) {
        console.error('Error in synthesizeKnowledgeFromSession:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});