import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Human Node Heartbeat Service (quorum_handshake)
 * Node 6 (Human / Governor) calls this to register active presence.
 * Other functions check the last heartbeat before executing critical governance actions.
 *
 * POST /humanNodeHeartbeat
 *   body: { action: "ping" | "check" }
 *
 * "ping"  — registers a fresh heartbeat timestamp for the authenticated user
 * "check" — returns whether the Human Node has been active within the last 30 minutes
 */

const HEARTBEAT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action || 'ping';

    if (action === 'ping') {
      // Register heartbeat — store as a GovernanceLimits metadata entry
      const existing = await base44.asServiceRole.entities.GovernanceLimits.filter({
        limit_name: 'human_node_heartbeat'
      });

      const heartbeatData = {
        limit_name: 'human_node_heartbeat',
        value: 1,
        description: 'Last recorded heartbeat for Human Node (Node 6)',
        is_active: true,
        set_by: user.email,
        metadata: {
          last_ping: new Date().toISOString(),
          user_email: user.email,
          user_role: user.role
        }
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.GovernanceLimits.update(existing[0].id, heartbeatData);
      } else {
        await base44.asServiceRole.entities.GovernanceLimits.create(heartbeatData);
      }

      return Response.json({
        success: true,
        action: 'ping',
        timestamp: new Date().toISOString(),
        node: 6,
        message: 'Human Node heartbeat registered. Mill Wheel may proceed.'
      });

    } else if (action === 'check') {
      const records = await base44.asServiceRole.entities.GovernanceLimits.filter({
        limit_name: 'human_node_heartbeat'
      });

      if (!records.length) {
        return Response.json({ active: false, message: 'No heartbeat on record. Human Node must ping first.' });
      }

      const lastPing = records[0].metadata?.last_ping;
      const elapsed = Date.now() - new Date(lastPing).getTime();
      const active = elapsed < HEARTBEAT_TIMEOUT_MS;

      return Response.json({
        active,
        last_ping: lastPing,
        elapsed_minutes: Math.floor(elapsed / 60000),
        message: active
          ? 'Human Node is active. Quorum handshake passed.'
          : 'Human Node heartbeat expired. Critical actions require re-authentication.'
      });
    }

    return Response.json({ error: 'Invalid action. Use "ping" or "check".' }, { status: 400 });

  } catch (error) {
    console.error('humanNodeHeartbeat error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});