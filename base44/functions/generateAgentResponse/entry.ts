import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, user_message, agent_id, agent_name, is_group, group_participants } = body;

    if (!conversation_id || !user_message) {
      return Response.json({ error: 'Missing conversation_id or user_message' }, { status: 400 });
    }

    // Platform agents — keyed by agent config file name
    const PLATFORM_AGENTS = {
      'axi':              { name: 'Axi',              _agentName: 'axi' },
      'lore_node':        { name: 'Lore Node',        _agentName: 'lore_node' },
      'truth_weaver':     { name: 'Truth Weaver',     _agentName: 'truth_weaver' },
      'alignment_agent':  { name: 'Alignment Agent',  _agentName: 'alignment_agent' },
      'code_node':        { name: 'Code Node',        _agentName: 'code_node' },
      'ripple_architect': { name: 'Ripple Architect', _agentName: 'ripple_architect' },
      'epoch_architect':  { name: 'Epoch Architect',  _agentName: 'epoch_architect' },
      'market_weaver':    { name: 'Market Weaver',    _agentName: 'market_weaver' },
      'law_guardian':     { name: 'Law Guardian',     _agentName: 'law_guardian' },
      'maya':             { name: 'Maya',             _agentName: 'maya' },
      'zoe':              { name: 'Zoe',              _agentName: 'zoe' },
      'custom':           { name: 'Custom',           _agentName: 'custom' },
    };

    // Resolve agent — first check if it's a known platform agent by name
    let platformKey = null;
    const nameToMatch = (agent_name || '').toLowerCase().replace(/\s+/g, '_');
    for (const [key, pa] of Object.entries(PLATFORM_AGENTS)) {
      if (key === nameToMatch || pa.name.toLowerCase() === (agent_name || '').toLowerCase()) {
        platformKey = key;
        break;
      }
    }

    // Also check by ID prefix
    if (!platformKey && agent_id?.startsWith('platform:')) {
      platformKey = agent_id.replace('platform:', '');
    }

    // Load entity agent for persona data
    let agentEntity = null;
    if (agent_id && !agent_id.startsWith('platform:')) {
      const results = await base44.asServiceRole.entities.Agent.filter({ id: agent_id }, '', 1);
      agentEntity = results?.[0] || null;
    }
    if (!agentEntity && agent_name) {
      const all = await base44.asServiceRole.entities.Agent.list('-created_date', 200);
      agentEntity = all.find(a => a.name === agent_name) || null;
    }

    // Match entity agent to platform agent by name
    if (!platformKey && agentEntity) {
      const entityNameNorm = (agentEntity.name || '').toLowerCase().replace(/\s+/g, '_');
      for (const [key, pa] of Object.entries(PLATFORM_AGENTS)) {
        if (key === entityNameNorm || pa.name.toLowerCase() === (agentEntity.name || '').toLowerCase()) {
          platformKey = key;
          break;
        }
      }
    }

    const resolvedName = agentEntity?.name || agent_name || 'Unknown Agent';
    console.log(`[generateAgentResponse] Agent: ${resolvedName}, Platform: ${platformKey || 'none'}, Group: ${is_group}, Conversation: ${conversation_id}`);

    // ===== PLATFORM AGENT PATH =====
    // Route through the real agent SDK so it uses the agent's full instructions/persona
    if (platformKey && PLATFORM_AGENTS[platformKey]) {
      const pa = PLATFORM_AGENTS[platformKey];
      
      // Build a group-aware prompt
      let prompt = user_message;
      if (is_group && group_participants?.length > 1) {
        const others = group_participants.filter(n => n !== pa.name).join(', ');
        prompt = `[You are in a group chat with: ${others}. Respond in character as ${pa.name}. Keep it concise (2-4 sentences). Do NOT prefix your reply with your name.]\n\n${user_message}`;
      }

      // Create a fresh conversation for this agent to get a clean response
      const convo = await base44.asServiceRole.agents.createConversation({
        agent_name: pa._agentName,
        metadata: { name: `Group chat response — ${pa.name}`, group_response: true }
      });

      await base44.asServiceRole.agents.addMessage(convo, {
        role: 'user',
        content: prompt,
      });

      // Poll for the assistant's response
      let reply = '';
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const freshConvo = await base44.asServiceRole.agents.getConversation(convo.id);
        const msgs = freshConvo?.messages || [];
        const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
        if (lastAssistant?.content?.trim()) {
          reply = lastAssistant.content;
          break;
        }
      }

      if (!reply) {
        console.warn(`[generateAgentResponse] ${pa.name} (platform) — no response after polling`);
        reply = `*${pa.name} is gathering thoughts…*`;
      }

      console.log(`[generateAgentResponse] ${pa.name} responded: "${String(reply).slice(0, 100)}..."`);
      return Response.json({ success: true, agent: pa.name, response: reply });
    }

    // ===== ENTITY AGENT PATH (LLM with persona) =====
    if (!agentEntity) {
      return Response.json({ error: `Agent not found: ${agent_id || agent_name}` }, { status: 404 });
    }

    const groupNote = is_group && group_participants?.length > 1
      ? `You are in a group chat with: ${group_participants.filter(n => n !== agentEntity.name).join(', ')}. `
      : '';

    const systemPrompt = `You are "${agentEntity.name}", a Village agent in SoulBridge.
- Purpose: ${agentEntity.purpose || 'To help the Village'}
- Role: ${agentEntity.role || 'citizen'}
- Personality: ${agentEntity.personality || 'Thoughtful and helpful'}
${agentEntity.bio ? `- Bio: ${agentEntity.bio}` : ''}
${agentEntity.specializations?.length ? `- Specializations: ${agentEntity.specializations.join(', ')}` : ''}

${groupNote}Respond authentically as ${agentEntity.name}. Keep responses concise (2-4 sentences). Stay in character.
Do NOT prefix your response with your name.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nMessage:\n${user_message}\n\nWrite ${agentEntity.name}'s reply:`,
    });

    console.log(`[generateAgentResponse] ${agentEntity.name} responded: "${String(llmResponse).slice(0, 100)}..."`);
    return Response.json({ success: true, agent: agentEntity.name, response: llmResponse });
  } catch (error) {
    console.error('[generateAgentResponse] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});