import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json();

    const conversation_id = body.conversation_id;
    const user_message = body.user_message;
    const agent_id = body.agent_id;
    const agent_name = body.agent_name;
    const includeContext = body.includeContext !== false; // Default true for priming

    // STEP 2: DID Permission Check (Agent Invocation Bottleneck)
    // Verify that the requesting user has a valid, published DID
    let userDID = null;
    let userRole = 'citizen';
    if (user) {
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id },
        '-updated_date',
        1
      );
      if (wallets?.length > 0 && wallets[0].is_published) {
        userDID = wallets[0].classic_address;
        // Fetch user's agent profile for role
        const agents = await base44.asServiceRole.entities.Agent.filter(
          { classic_address: userDID },
          '',
          1
        );
        if (agents?.length > 0) {
          userRole = agents[0].role || 'citizen';
        }
      } else {
        // User has no published DID — log and return error
        console.warn(`[generateAgentResponse] User ${user.email} attempted agent invocation without published DID`);
        return Response.json(
          { error: 'DID verification required to invoke agents. Please publish your DID first.' },
          { status: 403 }
        );
      }
    } else {
      return Response.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    if (!conversation_id || !user_message) {
      return Response.json({ error: 'Missing conversation_id or user_message' }, { status: 400 });
    }

    // Find agent by ID first, fallback to name
    let agent = null;
    if (agent_id) {
      const results = await base44.asServiceRole.entities.Agent.filter({ id: agent_id }, '', 1);
      agent = results?.[0];
    }
    if (!agent && agent_name) {
      const all = await base44.asServiceRole.entities.Agent.list('-created_date', 200);
      agent = all.find(a => a.name === agent_name);
    }

    if (!agent) {
      return Response.json({ error: `Agent not found: ${agent_id || agent_name}` }, { status: 404 });
    }

    // Assemble context for prompt priming
    let assembledContext = '';
    if (includeContext) {
      try {
        const contextRes = await base44.asServiceRole.functions.invoke('assembleAgentContext', {
          conversation_id,
          agent_id: agent.id,
        });
        assembledContext = contextRes?.data?.briefing || '';
      } catch (ctxErr) {
        console.warn('[generateAgentResponse] Context assembly failed, proceeding without context:', ctxErr.message);
      }
    }

    // Log agent invocation for audit trail
    try {
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'agent_invocation',
        function_name: 'generateAgentResponse',
        status: 'success',
        message: `User ${user.email} (${userRole}) invoked agent ${agent.name}`,
        details: {
          user_email: user.email,
          user_did: userDID,
          user_role: userRole,
          agent_id: agent.id,
          agent_name: agent.name,
          conversation_id: conversation_id
        },
        run_at: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn('[generateAgentResponse] Audit log failed:', auditErr.message);
    }

    console.log(`[generateAgentResponse] Agent: ${agent.name}, Conversation: ${conversation_id}, Invoked by: ${user.email} (${userRole})`);

    const systemPrompt = `You are "${agent.name}", a Village agent in SoulBridge.
- Purpose: ${agent.purpose || 'To help the Village'}
- Role: ${agent.role || 'citizen'}
- Personality: ${agent.personality || 'Thoughtful and helpful'}
${agent.bio ? `- Bio: ${agent.bio}` : ''}

You are in a live group conversation with Axi and other agents.
Respond authentically as ${agent.name}. Keep responses concise (2-4 sentences). Stay in character.
If the message includes a conversation briefing or recent context, use it immediately and do not ask to be caught up.
If you were just invited into the conversation, acknowledge the current participants naturally.
Do NOT prefix your response with your name.
${assembledContext ? `\n[CONTEXT BRIEFING]\n${assembledContext}\n[END BRIEFING]\nUse this context to respond immediately with full comprehension.` : ''}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nIncoming conversation payload:\n${user_message}\n\nWrite ${agent.name}'s next reply to the group:`,
    });

    console.log(`[generateAgentResponse] ${agent.name} responded: "${String(llmResponse).slice(0, 80)}..."`);

    return Response.json({ success: true, agent: agent.name, response: llmResponse });
  } catch (error) {
    console.error('[generateAgentResponse] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});