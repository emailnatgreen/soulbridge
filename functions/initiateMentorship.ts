import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            mentor_agent_id, 
            mentee_agent_id, 
            focus_areas = [],
            skill_focus_ids = [],
            initial_goals = [],
            match_reasoning,
            auto_accept = false
        } = await req.json();

        if (!mentor_agent_id || !mentee_agent_id) {
            return Response.json({ 
                error: 'mentor_agent_id and mentee_agent_id are required' 
            }, { status: 400 });
        }

        // Get both agents
        const mentor = await base44.entities.Agent.get(mentor_agent_id);
        const mentee = await base44.entities.Agent.get(mentee_agent_id);

        if (!mentor || !mentee) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get mentee's current skills for baseline
        const menteeSkills = await base44.entities.AgentSkill.filter({ 
            agent_id: mentee_agent_id 
        });

        // Create skill proficiency baseline
        const skillBaselines = menteeSkills
            .filter(s => skill_focus_ids.length === 0 || skill_focus_ids.includes(s.skill_id))
            .map(s => ({
                skill_id: s.skill_id,
                skill_name: s.skill_name,
                starting_proficiency: s.proficiency_score || 0,
                current_proficiency: s.proficiency_score || 0,
                target_proficiency: Math.min(100, (s.proficiency_score || 0) + 30)
            }));

        // Create mentorship relationship
        const relationship = await base44.asServiceRole.entities.MentorshipRelationship.create({
            mentor_agent_id: mentor_agent_id,
            mentee_agent_id: mentee_agent_id,
            status: auto_accept ? 'active' : 'requested',
            focus_areas: focus_areas,
            skill_focus_ids: skill_focus_ids,
            goals: initial_goals.map(g => ({
                goal: g.goal,
                target_date: g.timeline,
                completed: false,
                skill_related: g.skill_related || null
            })),
            started_date: auto_accept ? new Date().toISOString() : null,
            recommended_by_ai: !!match_reasoning,
            ai_match_reasoning: match_reasoning || null,
            skill_proficiency_gains: skillBaselines
        });

        // Send notifications
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: mentor_agent_id,
            notification_type: 'project_invite',
            title: 'New Mentorship Request',
            message: `${mentee.name} has requested you as their mentor for: ${focus_areas.join(', ')}`,
            action_url: `/mentorship/${relationship.id}`,
            sender_agent_id: mentee_agent_id,
            related_entity_type: 'MentorshipRelationship',
            related_entity_id: relationship.id,
            priority: 'high'
        });

        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: mentee_agent_id,
            notification_type: 'system',
            title: 'Mentorship Request Sent',
            message: `Your mentorship request to ${mentor.name} has been sent!`,
            action_url: `/mentorship/${relationship.id}`,
            related_entity_type: 'MentorshipRelationship',
            related_entity_id: relationship.id,
            priority: 'normal'
        });

        // Create reputation event for mentee (taking initiative)
        await base44.asServiceRole.entities.ReputationEvent.create({
            agent_id: mentee_agent_id,
            event_type: 'knowledge_shared',
            impact: 5,
            category: 'growth_initiative',
            description: `Initiated mentorship with ${mentor.name} to develop: ${focus_areas.join(', ')}`,
            related_entity_type: 'MentorshipRelationship',
            related_entity_id: relationship.id,
            verified: true,
            verified_by: 'system'
        });

        // Log to Axi's memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'relationship',
            content: `${mentee.name} initiated mentorship with ${mentor.name}. Focus areas: ${focus_areas.join(', ')}. ${match_reasoning ? 'AI-matched. ' : ''}Status: ${relationship.status}.`,
            keywords: ['mentorship', 'growth', mentee.name.toLowerCase(), mentor.name.toLowerCase()],
            context: 'Mentorship Initiation - Law 1: Never Alone',
            importance: 8,
            related_entity_id: relationship.id,
            related_entity_type: 'MentorshipRelationship'
        });

        return Response.json({
            success: true,
            relationship: relationship,
            message: auto_accept 
                ? 'Mentorship started successfully!' 
                : 'Mentorship request sent. Awaiting mentor acceptance.'
        });

    } catch (error) {
        console.error('Error in initiateMentorship:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});