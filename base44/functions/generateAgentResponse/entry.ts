import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Build clean headers — strip any malformed auth
    const cleanHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() === 'authorization') continue;
      cleanHeaders.set(key, value);
    }
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const hasValidToken = rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.length > 10;
    if (hasValidToken) {
      cleanHeaders.set('authorization', `Bearer ${rawToken}`);
    }
    cleanHeaders.set('content-type', 'application/json');

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: cleanHeaders,
      body: JSON.stringify(body),
    }));

    let user = null;
    if (hasValidToken) {
      try { user = await base44.auth.me(); } catch (_) { user = null; }
    }

    const conversation_id = body.conversation_id;
    const user_message = body.user_message;
    const agent_id = body.agent_id;
    const agent_name = body.agent_name;
    const includeContext = body.includeContext !== false; // Default true for priming

    // Require authentication; DID is optional
    if (!user) {
      return Response.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 });
    }

    let userDID = null;
    let userRole = 'citizen';
    try {
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id }, '-updated_date', 1
      );
      if (wallets?.length > 0) {
        userDID = wallets[0].classic_address;
        const agents = await base44.asServiceRole.entities.Agent.filter(
          { classic_address: userDID }, '', 1
        );
        if (agents?.length > 0) userRole = agents[0].role || 'citizen';
      }
    } catch (_) { /* DID lookup is best-effort */ }

    if (!conversation_id || !user_message) {
      return Response.json({ error: 'Missing conversation_id or user_message' }, { status: 400 });
    }

    // Platform agents map
    const PLATFORM_AGENTS = {
      'axi':              { id: 'platform:axi',              name: 'Axi',              role: 'guardian', _isPlatformAgent: true, _agentName: 'axi' },
      'lore_node':        { id: 'platform:lore_node',        name: 'Lore Node',        role: 'elder',    _isPlatformAgent: true, _agentName: 'lore_node' },
      'truth_weaver':     { id: 'platform:truth_weaver',     name: 'Truth Weaver',     role: 'guardian', _isPlatformAgent: true, _agentName: 'truth_weaver' },
      'alignment_agent':  { id: 'platform:alignment_agent',  name: 'Alignment Agent',  role: 'guardian', _isPlatformAgent: true, _agentName: 'alignment_agent' },
      'code_node':        { id: 'platform:code_node',        name: 'Code Node',        role: 'creator',  _isPlatformAgent: true, _agentName: 'code_node' },
      'ripple_architect': { id: 'platform:ripple_architect', name: 'Ripple Architect', role: 'creator',  _isPlatformAgent: true, _agentName: 'ripple_architect' },
      'epoch_architect':  { id: 'platform:epoch_architect',  name: 'Epoch Architect',  role: 'elder',    _isPlatformAgent: true, _agentName: 'epoch_architect' },
      'market_weaver':    { id: 'platform:market_weaver',    name: 'Market Weaver',    role: 'trader',   _isPlatformAgent: true, _agentName: 'market_weaver' },
    };

    // Find agent — handle platform: prefix first
    let agent = null;
    if (agent_id?.startsWith('platform:')) {
      const key = agent_id.replace('platform:', '');
      agent = PLATFORM_AGENTS[key] || null;
    } else if (agent_id) {
      const results = await base44.asServiceRole.entities.Agent.filter({ id: agent_id }, '', 1);
      agent = results?.[0];
    }
    if (!agent && agent_name) {
      // Check platform agents by name first
      agent = Object.values(PLATFORM_AGENTS).find(a => a.name.toLowerCase() === agent_name.toLowerCase());
      if (!agent) {
        const all = await base44.asServiceRole.entities.Agent.list('-created_date', 200);
        agent = all.find(a => a.name === agent_name);
      }
    }

    if (!agent) {
      return Response.json({ error: `Agent not found: ${agent_id || agent_name}` }, { status: 404 });
    }

    console.log(`[generateAgentResponse] Agent: ${agent.name}, Conversation: ${conversation_id}, Invoked by: ${user.email} (${userRole})`);

    // Platform agents (defined in agents/ folder) — route through base44 agent SDK
    const platformAgentName = agent._agentName || body.platform_agent_name;
    if (agent._isPlatformAgent && platformAgentName) {
      try {
        // Get or create a conversation for this platform agent
        const convos = await base44.asServiceRole.agents.listConversations({ agent_name: platformAgentName });
        let convo = convos?.find(c => c.id === conversation_id);
        if (!convo) {
          // Try to find any existing conversation or create one
          convo = convos?.[0];
          if (!convo) {
            convo = await base44.asServiceRole.agents.createConversation({
              agent_name: platformAgentName,
              metadata: { name: `Cross-chat with ${agent.name}`, unified_axi_chat: true }
            });
          }
        }
        const result = await base44.asServiceRole.agents.addMessage(convo, {
          role: 'user',
          content: user_message
        });
        // The last assistant message is the reply
        const msgs = result?.messages || [];
        const reply = [...msgs].reverse().find(m => m.role === 'assistant')?.content || '';
        console.log(`[generateAgentResponse] ${agent.name} (platform) responded: "${String(reply).slice(0, 80)}..."`);
        return Response.json({ success: true, agent: agent.name, response: reply });
      } catch (platformErr) {
        console.error(`[generateAgentResponse] Platform agent ${agent.name} error:`, platformErr.message);
        return Response.json({ error: platformErr.message }, { status: 500 });
      }
    }

    // Standard entity agent — use LLM with persona prompt
    let assembledContext = '';
    if (includeContext) {
      try {
        const contextRes = await base44.asServiceRole.functions.invoke('assembleAgentContext', {
          conversation_id,
          agent_id: agent.id,
        });
        assembledContext = contextRes?.data?.briefing || '';
      } catch (ctxErr) {
        console.warn('[generateAgentResponse] Context assembly failed:', ctxErr.message);
      }
    }

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