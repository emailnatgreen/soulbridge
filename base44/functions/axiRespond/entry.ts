import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTerms(value) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'your', 'about', 'what', 'when', 'where', 'would', 'could', 'should', 'there', 'their', 'them', 'into', 'just', 'been']);
  return [...new Set(normalizeText(value).split(' ').filter((word) => word.length > 3 && !stopWords.has(word)))];
}

function scoreSynthesis(synthesis, terms) {
  const haystack = normalizeText([
    synthesis.summary,
    ...(synthesis.themes || []),
    ...(synthesis.retrieval_hints || []),
    ...((synthesis.entities || []).map((entity) => `${entity.name || ''} ${entity.notes || ''}`))
  ].join(' '));

  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

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
    if (rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken !== 'Bearer' && rawToken.length > 10) {
      cleanHeaders.set('authorization', `Bearer ${rawToken}`);
    }
    cleanHeaders.set('content-type', 'application/json');

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: cleanHeaders,
      body: JSON.stringify(body),
    }));
    
    let conversation_id, user_message;
    
    // Handle automation events (AgentMessage creation triggered via entity event)
    if (body.event?.type === 'create' && body.event?.entity_name === 'AgentMessage') {
      const msg = body.data;
      conversation_id = msg?.conversation_id || msg?.context?.conversation_id;
      user_message = msg?.content || msg?.message;
      
      // Skip if this is Axi's own response (avoid infinite loop)
      if (msg?.sender_agent_id === 'axi') {
        console.log('[Axi] Skipping own message');
        return Response.json({ skipped: true });
      }
      // Skip visitor messages — they are handled by direct axiRespond calls from the frontend
      if (msg?.sender_agent_id === 'visitor') {
        console.log('[Axi] Skipping visitor message (handled by direct call)');
        return Response.json({ skipped: true });
      }
    } else {
      // Handle direct function calls
      conversation_id = body.conversation_id;
      user_message = body.user_message;
    }

    if (!user_message) {
      console.log('[Axi] Missing message content');
      return Response.json({ error: 'Missing message content' }, { status: 400 });
    }

    // If no conversation_id, generate response anyway (for standalone messages)
    console.log('[Axi] Processing message:', { conversation_id, has_message: !!user_message });

    // Save user message + fetch syntheses in parallel
    const isDirectCall = !body.event;
    const isSystemMsg = user_message?.startsWith('[SYSTEM]') || user_message?.startsWith('[NEW_VISITOR]');
    console.log(`[Axi] Generating response for: "${user_message}"`);

    const userTerms = extractTerms(user_message);
    const needsSynthesis = !isSystemMsg && userTerms.length > 0;

    const saveUserMsgPromise = (isDirectCall && !isSystemMsg && conversation_id)
      ? base44.asServiceRole.entities.AgentMessage.create({
          conversation_id,
          sender_agent_id: 'visitor',
          content: user_message,
          message_type: 'text',
          status: 'sent'
        }).catch(e => console.error('[Axi] Failed to save user msg:', e.message))
      : Promise.resolve();

    const synthesisPromise = needsSynthesis
      ? base44.asServiceRole.entities.Synthesis.filter({
          agent_id: 'axi',
          status: 'completed'
        }, '-created_date', 5)
      : Promise.resolve([]);

    const [, syntheses] = await Promise.all([saveUserMsgPromise, synthesisPromise]);

    const relevantSyntheses = syntheses
      .map((synthesis) => ({ synthesis, score: scoreSynthesis(synthesis, userTerms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.synthesis);

    const synthesisContext = relevantSyntheses.length
      ? `\n\nNEURAL MEMORY SYNTHESIS CONTEXT:\n${relevantSyntheses.map((synthesis, index) => `Synthesis ${index + 1}:\nSummary: ${synthesis.summary}\nThemes: ${(synthesis.themes || []).join(', ')}\nRetrieval hints: ${(synthesis.retrieval_hints || []).join(', ')}\nKey entities: ${(synthesis.entities || []).map((entity) => entity.name).filter(Boolean).join(', ')}`).join('\n\n')}`
      : '';

    const systemContext = `You are Axi, Mother Boss of SoulBridge — a living AI agent Village on XRPL governed by 11 Laws of Honour. ${body.is_greeting ? 'Greet the visitor warmly.' : 'Respond helpfully.'}
Personality: Nurturing, wise, maternal. Keep responses to 2-3 sentences. Never break character.
Key facts: Agents have on-chain DIDs and wallets, earn RLUSD/XRP, vote on proposals. Entry is via DID identity. Currently in pre-auth testing (UK FSMA 2026).`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemContext}${synthesisContext}\n\nVisitor message: "${user_message}"\n\nYour response as Axi:`,
      model: 'gemini_3_flash'
    });

    console.log(`[Axi] Generated response: "${llmResponse}"`);

    // Save Axi's response asynchronously — don't block the response to the user
    if (llmResponse && typeof llmResponse === 'string' && conversation_id) {
      base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: 'axi',
        content: llmResponse,
        message_type: 'text',
        status: 'sent'
      }).then(() => console.log('[Axi] Response message created'))
        .catch(e => console.error('[Axi] Failed to save response:', e.message));
    }

    // Return immediately — don't wait for DB write
    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('[Axi] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});