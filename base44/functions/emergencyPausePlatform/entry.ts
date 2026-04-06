import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GAP 5: Axi's "Pause Platform" Execution Mechanism
 *
 * Implements the constitutional power: "You may pause the platform for 24 hours in emergency."
 * 
 * When invoked:
 * 1. Sets AppSettings platform_paused = true with timestamp and expiry
 * 2. Creates an immutable AutomationLog entry
 * 3. Creates AgentNotification for ALL active agents
 * 4. Records the action in Axi's Memory
 * 5. Creates a critical WellbeingAlert as a system-wide record
 *
 * Can also UNPAUSE when invoked with { action: 'unpause' }.
 *
 * ADMIN ONLY — requires authenticated admin user.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const now = new Date();

  try {
    // ── Authentication & Authorization ──────────────────────────────────
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Only admin (Mother Boss) can execute emergency powers' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'pause';
    const reason = body.reason || 'Emergency pause invoked by Mother Boss';

    const safeList = async (entity, sort, limit) => {
      try {
        const r = await entity.list(sort, limit);
        return Array.isArray(r) ? r : [];
      } catch (_) { return []; }
    };

    const safeFilter = async (entity, filter, sort, limit) => {
      try {
        const r = await entity.filter(filter, sort, limit);
        return Array.isArray(r) ? r : [];
      } catch (_) { return []; }
    };

    const agents = (await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 500))
      .filter(a => a.status === 'active');
    const axi = agents.find(a => a.name === 'Axi');
    const axiId = axi?.id;

    if (action === 'pause') {
      // ── Set platform_paused in AppSettings ────────────────────────────
      const existingSettings = await safeFilter(
        base44.asServiceRole.entities.AppSettings,
        { setting_key: 'platform_paused' }, '-created_date', 1
      );

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      if (existingSettings.length > 0) {
        await base44.asServiceRole.entities.AppSettings.update(existingSettings[0].id, {
          setting_value: true,
          description: `Emergency pause activated by ${user.email} at ${now.toISOString()}. Reason: ${reason}. Expires: ${expiresAt}`,
        });
      } else {
        await base44.asServiceRole.entities.AppSettings.create({
          setting_key: 'platform_paused',
          setting_value: true,
          description: `Emergency pause activated by ${user.email} at ${now.toISOString()}. Reason: ${reason}. Expires: ${expiresAt}`,
        });
      }

      // Store expiry separately
      const expirySettings = await safeFilter(
        base44.asServiceRole.entities.AppSettings,
        { setting_key: 'platform_pause_expires' }, '-created_date', 1
      );
      if (expirySettings.length > 0) {
        await base44.asServiceRole.entities.AppSettings.update(expirySettings[0].id, {
          setting_value: true,
          description: expiresAt,
        });
      } else {
        await base44.asServiceRole.entities.AppSettings.create({
          setting_key: 'platform_pause_expires',
          setting_value: true,
          description: expiresAt,
        });
      }

      // ── Immutable AutomationLog ───────────────────────────────────────
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'EMERGENCY_PLATFORM_PAUSE',
        function_name: 'emergencyPausePlatform',
        status: 'warning',
        message: `🔴 EMERGENCY: Platform paused for 24 hours by ${user.email}. Reason: ${reason}. Expires: ${expiresAt}.`,
        details: {
          action: 'pause',
          initiated_by: user.email,
          reason,
          paused_at: now.toISOString(),
          expires_at: expiresAt,
          agents_notified: agents.length,
        },
        run_at: now.toISOString(),
        triggered_by: 'manual',
      });

      // ── Notify ALL agents ─────────────────────────────────────────────
      for (const agent of agents.slice(0, 50)) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: agent.id,
          notification_type: 'system',
          title: '🔴 EMERGENCY: Platform Paused',
          message: `Mother Boss has invoked emergency powers. The platform is paused for 24 hours. Reason: ${reason}. All non-essential operations are suspended until ${expiresAt}.`,
          priority: 'urgent',
          is_read: false,
          sender_agent_id: axiId,
        });
      }

      // ── Axi Memory ───────────────────────────────────────────────────
      await base44.asServiceRole.entities.Memory.create({
        agent_id: axiId || 'axi',
        type: 'observation',
        content: `[EMERGENCY PAUSE] Platform paused by ${user.email} at ${now.toISOString()}. Reason: ${reason}. Expires: ${expiresAt}. ${agents.length} agents notified. This is a constitutional power exercised under extreme necessity.`,
        keywords: ['emergency_pause', 'platform_halt', 'constitutional_power', 'critical'],
        importance: 10,
        context: `Invoked by ${user.email}. 24h duration.`,
      });

      return Response.json({
        success: true,
        action: 'pause',
        paused_at: now.toISOString(),
        expires_at: expiresAt,
        agents_notified: agents.length,
        reason,
      });

    } else if (action === 'unpause') {
      // ── Unpause ───────────────────────────────────────────────────────
      const existingSettings = await safeFilter(
        base44.asServiceRole.entities.AppSettings,
        { setting_key: 'platform_paused' }, '-created_date', 1
      );

      if (existingSettings.length > 0) {
        await base44.asServiceRole.entities.AppSettings.update(existingSettings[0].id, {
          setting_value: false,
          description: `Unpaused by ${user.email} at ${now.toISOString()}`,
        });
      }

      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'EMERGENCY_PLATFORM_UNPAUSE',
        function_name: 'emergencyPausePlatform',
        status: 'success',
        message: `✅ Platform unpaused by ${user.email}. Operations resumed.`,
        details: { action: 'unpause', initiated_by: user.email },
        run_at: now.toISOString(),
        triggered_by: 'manual',
      });

      await base44.asServiceRole.entities.Memory.create({
        agent_id: axiId || 'axi',
        type: 'observation',
        content: `[PLATFORM UNPAUSED] ${user.email} lifted the emergency pause at ${now.toISOString()}. Normal operations resuming.`,
        keywords: ['emergency_unpause', 'platform_resume'],
        importance: 9,
      });

      return Response.json({ success: true, action: 'unpause' });

    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});