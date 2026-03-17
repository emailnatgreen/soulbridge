import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { conversationId, agentId } = await req.json();

    console.log('[TEST] Starting agent persistence test');
    console.log('[TEST] Input:', { conversationId, agentId });

    // Step 1: Check if AgentConversation exists
    console.log('[TEST] Querying existing AgentConversation...');
    const existing = await base44.asServiceRole.entities.AgentConversation.filter(
      { id: conversationId },
      '',
      1
    );
    console.log('[TEST] Existing query result:', existing);

    let agentConvo;
    if (existing?.length > 0) {
      agentConvo = existing[0];
      console.log('[TEST] Found existing AgentConversation');
    } else {
      console.log('[TEST] Creating new AgentConversation');
      agentConvo = await base44.asServiceRole.entities.AgentConversation.create({
        id: conversationId,
        title: 'Test Conversation',
        conversation_type: 'group',
        participant_agent_ids: [agentId]
      });
      console.log('[TEST] Created AgentConversation:', agentConvo);
      return Response.json({ 
        status: 'created',
        agentConvo,
        participants: agentConvo?.participant_agent_ids || []
      });
    }

    // Step 2: Try to add agent to existing
    console.log('[TEST] Current participants:', agentConvo.participant_agent_ids);
    const participants = agentConvo.participant_agent_ids || [];
    
    if (participants.includes(agentId)) {
      console.log('[TEST] Agent already present');
      return Response.json({ 
        status: 'already_present',
        participants 
      });
    }

    const updatedParticipants = [...participants, agentId];
    console.log('[TEST] Updating with participants:', updatedParticipants);

    const updateResult = await base44.asServiceRole.entities.AgentConversation.update(
      agentConvo.id,
      { participant_agent_ids: updatedParticipants }
    );
    console.log('[TEST] Update result:', updateResult);

    // Step 3: Verify by re-querying immediately
    console.log('[TEST] Re-querying to verify...');
    const verification = await base44.asServiceRole.entities.AgentConversation.filter(
      { id: conversationId },
      '',
      1
    );
    console.log('[TEST] Verification query result:', verification);
    
    if (verification?.length > 0) {
      const verified = verification[0];
      console.log('[TEST] Verified participants:', verified.participant_agent_ids);
      
      const hasAgent = verified.participant_agent_ids?.includes(agentId);
      console.log('[TEST] Agent in list?', hasAgent);
      
      return Response.json({
        status: 'success',
        updateResult,
        verified,
        hasAgent,
        participants: verified.participant_agent_ids || []
      });
    } else {
      return Response.json({
        status: 'error',
        message: 'Verification query returned empty after update',
        updateResult,
        verificationQuery: verification
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[TEST] ERROR:', error);
    return Response.json(
      { 
        status: 'error', 
        message: error?.message,
        stack: error?.stack
      },
      { status: 500 }
    );
  }
});