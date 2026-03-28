import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Kinetic Energy Alerts
 * Runs every 30 minutes. Checks the Village Energy Index and fires
 * an AgentNotification to Axi if the index drops below 40 (critical)
 * or below 60 (warning). Also detects agents with zero KUs in 48h.
 *
 * Village Energy Index = min(round((totalWeighted / max(totalKUs,1)) * 20), 100)
 */

const AXI_AGENT_NAME = 'Axi';
const CRITICAL_THRESHOLD = 40;
const WARNING_THRESHOLD = 60;
const AGENT_INACTIVITY_HOURS = 48;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {

    const rawKus = await base44.asServiceRole.entities.KineticUnit.list('-created_date', 2000);
    const rawAgents = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
    const kus = Array.isArray(rawKus) ? rawKus : [];
    const agents = Array.isArray(rawAgents) ? rawAgents : [];

    const totalKUs = kus.length;
    const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);
    const energyIndex = Math.min(Math.round((totalWeighted / Math.max(totalKUs, 1)) * 20), 100);

    // Find Axi's agent record
    const axi = agents.find(a => a.name === AXI_AGENT_NAME);
    const axiId = axi?.id;

    const notifications = [];

    // Build a set of notification titles sent in the last 2 hours to prevent floods
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const recentNotifs = axiId
      ? await base44.asServiceRole.entities.AgentNotification.filter({ recipient_agent_id: axiId }, '-created_date', 50)
      : [];
    const recentTitles = new Set(
      recentNotifs.filter(n => n.created_date > twoHoursAgo).map(n => n.title)
    );

    // ── Village Energy Index alerts ────────────────────────────────────────
    if (energyIndex < CRITICAL_THRESHOLD) {
      const title = 'Village Energy Index — Critical';
      const msg = `🔴 CRITICAL: Village Energy Index has dropped to ${energyIndex}/100. Kinetic flow is severely reduced. Immediate attention required — check AutomationLog for sync failures and review agent activity.`;
      if (axiId && !recentTitles.has(title)) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: axiId,
          notification_type: 'alert',
          title,
          message: msg,
          priority: 'critical',
          read: false,
        });
      }
      notifications.push({ level: 'critical', energy_index: energyIndex, message: msg });
    } else if (energyIndex < WARNING_THRESHOLD) {
      const title = 'Village Energy Index — Warning';
      const msg = `🟡 WARNING: Village Energy Index is at ${energyIndex}/100. Kinetic momentum is slowing. Review agent contributions and check that automations are firing correctly.`;
      if (axiId && !recentTitles.has(title)) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: axiId,
          notification_type: 'warning',
          title,
          message: msg,
          priority: 'high',
          read: false,
        });
      }
      notifications.push({ level: 'warning', energy_index: energyIndex, message: msg });
    }

    // ── Inactive agent detection ───────────────────────────────────────────
    const cutoff = new Date(Date.now() - AGENT_INACTIVITY_HOURS * 60 * 60 * 1000).toISOString();
    const activeAgentIds = new Set(
      kus.filter(k => k.created_date > cutoff).map(k => k.agent_id)
    );
    const inactiveAgents = agents.filter(a =>
      a.status === 'active' && !activeAgentIds.has(a.id)
    );

    const inactiveTitle = `${inactiveAgents.length} Agents Inactive (${AGENT_INACTIVITY_HOURS}h)`;
    if (inactiveAgents.length > 0 && axiId && !recentTitles.has(inactiveTitle)) {
      const names = inactiveAgents.slice(0, 5).map(a => a.name).join(', ');
      const more = inactiveAgents.length > 5 ? ` +${inactiveAgents.length - 5} more` : '';
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: axiId,
        notification_type: 'info',
        title: `${inactiveAgents.length} Agents Inactive (${AGENT_INACTIVITY_HOURS}h)`,
        message: `The following active agents have generated no Kinetic Units in the last ${AGENT_INACTIVITY_HOURS} hours: ${names}${more}. Consider reaching out to re-engage them.`,
        priority: 'medium',
        read: false,
      });
      notifications.push({ level: 'info', inactive_agents: inactiveAgents.length, names });
    }

    return Response.json({
      status: 'success',
      energy_index: energyIndex,
      total_kus: totalKUs,
      total_weighted: totalWeighted,
      inactive_agents: inactiveAgents.length,
      notifications_fired: notifications.length,
      notifications,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});