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
            focus_areas, 
            goals,
            match_reasoning 
        } = await req.json();

        // Update mentor's current mentees count
        const mentorProfiles = await base44.asServiceRole.entities.MentorProfile.filter({ 
            agent_id: mentor_agent_id 
        });
        
        if (mentorProfiles.length > 0) {
            const profile = mentorProfiles[0];
            if (profile.current_mentees >= profile.max_mentees) {
                return Response.json({ 
                    error: 'Mentor at capacity' 
                }, { status: 400 });
            }
        }

        const relationship = await base44.asServiceRole.entities.MentorshipRelationship.create({
            mentor_agent_id,
            mentee_agent_id,
            status: 'requested',
            focus_areas,
            goals: goals?.map(g => ({ goal: g, completed: false })) || [],
            started_date: new Date().toISOString(),
            target_duration_weeks: 12,
            recommended_by_ai: !!match_reasoning,
            ai_match_reasoning: match_reasoning
        });

        // Send notification to mentor
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: mentor_agent_id,
            notification_type: 'message',
            title: 'New Mentorship Request',
            message: `You have received a mentorship request. Focus areas: ${focus_areas?.join(', ')}`,
            action_url: '/mentorship',
            related_entity_type: 'MentorshipRelationship',
            related_entity_id: relationship.id,
            priority: 'normal'
        });

        return Response.json({
            success: true,
            relationship,
            message: 'Mentorship request sent'
        });

    } catch (error) {
        console.error('Mentorship request error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});