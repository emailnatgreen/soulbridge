import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ─── Signal Tower ───────────────────────────────────────────────
function signalTower(rawSignal) {
  return {
    ...rawSignal,
    amplified: true,
    timestamp: new Date().toISOString(),
    source: 'SoulBridge_NervousSystem_v1',
  };
}

// ─── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { signal_type, page_id, user_action } = await req.json();

    const rawSignal = { signal_type, page_id, user_action };
    console.log('[SignalProcessor] Raw signal received:', rawSignal);

    const amplified = signalTower(rawSignal);
    console.log('[SignalProcessor] Amplified signal:', amplified);

    // ── Bootstrap: create service-role-owned lobby if needed ──
    if (signal_type === 'bootstrap_lobby') {
      const convo = await base44.asServiceRole.agents.createConversation({
        agent_name: 'axi',
        metadata: { name: 'SoulBridge Welcome Lobby', unified_axi_chat: true, service_owned: true },
      });
      console.log('[SignalProcessor] Lobby created:', convo.id);
      return Response.json({ success: true, lobby_id: convo.id });
    }

    const lobbyId = Deno.env.get('LOBBY_CONVERSATION_ID');
    if (!lobbyId) {
      return Response.json({ error: 'LOBBY_CONVERSATION_ID not set' }, { status: 500 });
    }

    if (signal_type === 'new_user') {
      console.log('[SignalProcessor] Sending welcome to lobby:', lobbyId);
      const convo = await base44.asServiceRole.agents.getConversation(lobbyId);
      await base44.asServiceRole.agents.addMessage(convo, {
        role: 'user',
        content: `[System Signal: new_user entered on page "${page_id}". Axi, please greet them with a warm, brief welcome to SoulBridge.]`,
      });
      console.log('[SignalProcessor] Welcome message sent.');
    }

    return Response.json({
      success: true,
      signal: amplified,
      conversation_id: lobbyId,
    });

  } catch (error) {
    console.error('[SignalProcessor] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});