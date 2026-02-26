import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { relationshipIds, sendMessages = true } = payload;

    if (!relationshipIds || !Array.isArray(relationshipIds) || relationshipIds.length === 0) {
      return Response.json({ error: 'relationshipIds array required' }, { status: 400 });
    }

    const sentProposals = [];
    const errors = [];

    for (const relationshipId of relationshipIds) {
      try {
        // Fetch the MentorshipRelationship
        const relationship = await base44.entities.MentorshipRelationship.read(relationshipId);
        if (!relationship) {
          errors.push({ relationshipId, error: 'Relationship not found' });
          continue;
        }

        // Ensure status is 'requested'
        if (relationship.status !== 'requested') {
          errors.push({ relationshipId, error: `Invalid status: ${relationship.status}` });
          continue;
        }

        // Fetch mentor and mentee agents
        const mentor = await base44.entities.Agent.read(relationship.mentor_agent_id);
        const mentee = await base44.entities.Agent.read(relationship.mentee_agent_id);

        if (!mentor || !mentee) {
          errors.push({ relationshipId, error: 'Mentor or mentee agent not found' });
          continue;
        }

        if (sendMessages) {
          // Send proposal message to mentor
          const mentorProposal = await base44.entities.AgentMessage.create({
            sender_agent_id: 'system',
            recipient_agent_id: relationship.mentor_agent_id,
            message_type: 'mentorship_proposal',
            subject: `New Mentorship Opportunity: ${mentee.name}`,
            content: `${mentee.name} seeks mentorship in: ${relationship.focus_areas.join(', ')}. Match Quality: ${relationship.match_quality_score}/100`,
            metadata: {
              relationshipId,
              mentee_name: mentee.name,
              focus_areas: relationship.focus_areas,
              match_quality_score: relationship.match_quality_score,
              ai_match_reasoning: relationship.ai_match_reasoning,
              match_criteria: relationship.match_criteria,
              goals: relationship.goals
            },
            is_read: false
          });

          // Send proposal message to mentee
          const menteeProposal = await base44.entities.AgentMessage.create({
            sender_agent_id: 'system',
            recipient_agent_id: relationship.mentee_agent_id,
            message_type: 'mentorship_proposal',
            subject: `Mentorship Match Recommended: ${mentor.name}`,
            content: `AI recommends ${mentor.name} as your mentor. Match Quality: ${relationship.match_quality_score}/100`,
            metadata: {
              relationshipId,
              mentor_name: mentor.name,
              mentor_specializations: mentor.specializations,
              match_quality_score: relationship.match_quality_score,
              ai_match_reasoning: relationship.ai_match_reasoning,
              match_criteria: relationship.match_criteria
            },
            is_read: false
          });

          sentProposals.push({
            relationshipId,
            mentorMessageId: mentorProposal.id,
            menteeMessageId: menteeProposal.id,
            status: 'messages_sent'
          });
        } else {
          sentProposals.push({
            relationshipId,
            status: 'ready_for_review'
          });
        }
      } catch (error) {
        errors.push({ relationshipId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      sentProposals,
      errors: errors.length > 0 ? errors : null,
      totalProcessed: relationshipIds.length,
      successCount: sentProposals.length
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});