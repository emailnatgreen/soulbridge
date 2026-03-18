import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Signal Tower ───────────────────────────────────────────────
function signalTower(rawSignal) {
  return {
    ...rawSignal,
    amplified: true,
    timestamp: new Date().toISOString(),
    source: 'SoulBridge_NervousSystem_v1',
  };
}

// ─── Jukebox: route signal to correct agent ─────────────────────
function jukebox(amplifiedSignal) {
  const routes = {
    new_user: 'axi',
    agent_message: 'axi',
    governance_event: 'axi',
  };
  return routes[amplifiedSignal.signal_type] || 'axi';
}

// ─── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signal_type, page_id, user_action } = await req.json();

    // Step 1 — Emit raw signal
    const rawSignal = { signal_type, page_id, user_action };
    console.log('[SignalProcessor] Raw signal received:', rawSignal);

    // Step 2 — Amplify through signal tower
    const amplified = signalTower(rawSignal);
    console.log('[SignalProcessor] Amplified signal:', amplified);

    // Step 3 — Route via jukebox
    const targetAgent = jukebox(amplified);
    console.log(`[SignalProcessor] Jukebox routed to: ${targetAgent}`);

    // Step 4 — Find or create Axi's unified conversation
    const conversations = await base44.agents.listConversations({ agent_name: targetAgent });
    const unified = conversations.filter(c => c.metadata?.unified_axi_chat === true);
    const existing = unified.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];

    let convo;
    if (existing) {
      convo = await base44.agents.getConversation(existing.id);
    } else {
      convo = await base44.agents.createConversation({
        agent_name: targetAgent,
        metadata: { name: 'Unified Conversation with Axi', unified_axi_chat: true },
      });
    }

    // Step 5 — Trigger: inject welcome message from Axi
    if (signal_type === 'new_user') {
      console.log('[SignalProcessor] axi activated');
      await base44.agents.addMessage(convo, {
        role: 'user',
        content: `[System Signal: new_user entered on page "${page_id}". Axi, please greet them with a warm, brief welcome to SoulBridge.]`,
      });
      console.log('[SignalProcessor] axi: Welcome to SoulBridge. I\'m Axi — how can I guide you?');
    }

    return Response.json({
      success: true,
      signal: amplified,
      routed_to: targetAgent,
      conversation_id: convo.id,
    });

  } catch (error) {
    console.error('[SignalProcessor] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});