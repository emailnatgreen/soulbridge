import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id, round_number = 1 } = await req.json();

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required' }, { status: 400 });
    }

    let proposals = [];
    try {
      proposals = await base44.entities.GovernanceProposal.filter({ id: proposal_id });
    } catch (e) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[0];

    // Fetch discussion messages if any
    const discussionMessages = proposal.discussion_messages || [];
    let discussionSummary = 'No discussion yet.';

    if (discussionMessages.length > 0) {
      const messages = await Promise.all(
        discussionMessages.slice(-10).map(msgId =>
          base44.entities.AgentMessage.filter({ id: msgId }).then(msgs => msgs[0])
        )
      );

      const validMessages = messages.filter(m => m !== undefined);

      if (validMessages.length > 0) {
        const messageTexts = validMessages
          .map(m => `${m.sender_name}: ${m.content}`)
          .join('\n\n');

        // Use LLM to synthesize debate
        const synthesis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this governance debate and generate a structured synthesis. Extract the strongest arguments from each side, identify common ground, and suggest next discussion topics.

**Proposal:** ${proposal.title}

**Recent Discussion:**
${messageTexts}

Provide:
1. Summary of pro arguments raised
2. Summary of con arguments raised
3. Points of potential agreement or compromise
4. Unaddressed concerns that should be discussed
5. Suggested next debate topic to deepen understanding`,
          response_json_schema: {
            type: 'object',
            properties: {
              pro_arguments: { type: 'array', items: { type: 'string' } },
              con_arguments: { type: 'array', items: { type: 'string' } },
              common_ground: { type: 'array', items: { type: 'string' } },
              unaddressed_concerns: { type: 'array', items: { type: 'string' } },
              suggested_next_topic: { type: 'string' }
            }
          }
        });

        discussionSummary = synthesis;
      }
    }

    // Generate structured debate framework for next round
    const debateFramework = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a structured debate framework for the next round of discussion on this governance proposal. The framework should guide agents toward productive dialogue and help bridge disagreements.

**Proposal:** ${proposal.title}
**Description:** ${proposal.description}
**Current Round:** ${round_number}

Generate:
1. Key questions both sides should answer
2. Values/principles to reference in debate
3. Evidence types that would strengthen arguments
4. Fallacies to avoid
5. Norms for respectful disagreement
6. Success criteria for reaching consensus`,
      response_json_schema: {
        type: 'object',
        properties: {
          key_questions: { type: 'array', items: { type: 'string' } },
          guiding_principles: { type: 'array', items: { type: 'string' } },
          evidence_criteria: { type: 'array', items: { type: 'string' } },
          logical_fallacies_to_avoid: { type: 'array', items: { type: 'string' } },
          respectful_engagement_norms: { type: 'array', items: { type: 'string' } },
          consensus_criteria: { type: 'string' }
        }
      }
    });

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      round_number: round_number,
      discussion_synthesis: discussionSummary,
      next_round_framework: debateFramework,
      message: `Structured debate framework ready for round ${round_number + 1}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});