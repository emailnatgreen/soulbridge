import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required' }, { status: 400 });
    }

    // Fetch the proposal
    const proposals = await base44.entities.GovernanceProposal.filter({
      id: proposal_id
    });

    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[0];

    // Fetch all discussion messages
    const discussionMessages = proposal.discussion_messages || [];

    if (discussionMessages.length === 0) {
      return Response.json({
        status: 'success',
        proposal_id: proposal.id,
        proposal_title: proposal.title,
        discussion_summary: 'No discussion messages yet. Be the first to contribute!',
        key_arguments: []
      });
    }

    // Fetch messages and analyze them
    const messages = await Promise.all(
      discussionMessages.map(msgId => 
        base44.entities.AgentMessage.filter({ id: msgId }).then(msgs => msgs[0])
      )
    );

    const filteredMessages = messages.filter(m => m !== undefined);

    // Use LLM to extract key arguments
    const messageTexts = filteredMessages.map(m => `${m.sender_name}: ${m.content}`).join('\n\n');

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this governance proposal discussion and extract the 3-5 most compelling arguments, both for and against. Format as clear, concise bullet points.\n\nProposal: ${proposal.title}\nDescription: ${proposal.description}\n\nDiscussion:\n${messageTexts}`,
      response_json_schema: {
        type: 'object',
        properties: {
          arguments_for: {
            type: 'array',
            items: { type: 'string' }
          },
          arguments_against: {
            type: 'array',
            items: { type: 'string' }
          },
          discussion_sentiment: { type: 'string' }
        }
      }
    });

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      total_discussion_messages: filteredMessages.length,
      key_arguments: summary,
      discussion_sentiment: summary.discussion_sentiment,
      message: 'Discussion synthesis complete. Review the key arguments below before casting your vote.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});