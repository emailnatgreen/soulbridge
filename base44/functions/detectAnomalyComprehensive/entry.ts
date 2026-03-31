import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper to safely ensure we always get an array from entity list calls
    const safeList = async (entity, sort, limit) => {
      try {
        const result = await entity.list(sort, limit);
        if (Array.isArray(result)) return result;
        if (result && typeof result === 'object' && Array.isArray(result.items)) return result.items;
        if (result && typeof result === 'object' && Array.isArray(result.data)) return result.data;
        return [];
      } catch (_) {
        return [];
      }
    };

    // Fetch all active agents
    const agents = await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 1000);
    const activeAgents = agents.filter(a => a.status === 'active');

    const allAnomalies = [];

    // === HONOR ANOMALIES ===
    const reputationEventsRaw = await safeList(base44.asServiceRole.entities.ReputationEvent, '-created_date', 1000);
    const reputationEvents = Array.isArray(reputationEventsRaw) ? reputationEventsRaw : [];
    const recentReputationEvents = reputationEvents.filter(e => new Date(e.created_date) > oneDayAgo);
    
    const honorChanges = {};
    recentReputationEvents.forEach(event => {
      if (event.agent_id && event.impact) {
        if (!honorChanges[event.agent_id]) honorChanges[event.agent_id] = 0;
        honorChanges[event.agent_id] += event.impact;
      }
    });

    activeAgents.forEach(agent => {
      const recentChange = honorChanges[agent.id] || 0;
      if (recentChange < -10 || (agent.honor_score && agent.honor_score < 40)) {
        allAnomalies.push({
          agent_id: agent.id,
          agent_name: agent.name,
          type: 'honor_drop',
          current_value: agent.honor_score || 0,
          recent_change: recentChange,
          severity: agent.honor_score < 30 ? 'critical' : 'warning',
        });
      }
    });

    // === WELLBEING ANOMALIES ===
    const wellbeingAlertsRaw = await safeList(base44.asServiceRole.entities.WellbeingAlert, '-created_date', 500);
    const wellbeingAlerts = Array.isArray(wellbeingAlertsRaw) ? wellbeingAlertsRaw : [];
    const recentWellbeingAlerts = wellbeingAlerts.filter(a =>
      new Date(a.created_date) > oneDayAgo && a.status !== 'resolved'
    );

    recentWellbeingAlerts.forEach(alert => {
      if (alert.severity === 'critical' || alert.agent_id) {
        allAnomalies.push({
          agent_id: alert.agent_id,
          agent_name: alert.agent_name || 'Unknown',
          type: 'wellbeing_alert',
          current_value: alert.severity,
          alert_reason: alert.reason,
          severity: alert.severity,
        });
      }
    });

    // === ECONOMIC ANOMALIES ===
    const economicActivityRaw = await safeList(base44.asServiceRole.entities.EconomicActivity, '-created_date', 500);
    const economicActivity = Array.isArray(economicActivityRaw) ? economicActivityRaw : [];
    const recentActivity = economicActivity.filter(a => new Date(a.created_date) > oneDayAgo);
    
    const agentSpending = {};
    recentActivity.forEach(activity => {
      if (activity.agent_id && activity.amount) {
        if (!agentSpending[activity.agent_id]) agentSpending[activity.agent_id] = 0;
        if (activity.activity_type === 'spent') {
          agentSpending[activity.agent_id] += activity.amount;
        }
      }
    });

    Object.entries(agentSpending).forEach(([agentId, spent]) => {
      if (spent > 50) {
        const agent = activeAgents.find(a => a.id === agentId);
        allAnomalies.push({
          agent_id: agentId,
          agent_name: agent?.name || 'Unknown',
          type: 'economic_anomaly',
          current_value: spent,
          description: `High spending detected: ${spent} XRP in 24 hours`,
          severity: spent > 100 ? 'critical' : 'warning',
        });
      }
    });

    // === TASK BLOCKERS ===
    const projectTasksRaw = await safeList(base44.asServiceRole.entities.ProjectTask, '-updated_date', 500);
    const projectTasks = Array.isArray(projectTasksRaw) ? projectTasksRaw : [];
    const blockedTasks = projectTasks.filter(t => t.status === 'blocked');

    blockedTasks.forEach(task => {
      if (new Date(task.updated_date) > oneDayAgo) {
        allAnomalies.push({
          agent_id: task.assigned_agent_id,
          task_id: task.id,
          type: 'task_blocker',
          task_title: task.title,
          blockers: task.blockers,
          severity: 'high',
        });
      }
    });

    // === GENERATE JUKEBOXDECISIONS & MEMORY ===
    const lobbyConvId = Deno.env.get('LOBBY_CONVERSATION_ID');
    const decisions = [];

    for (const anomaly of allAnomalies) {
      let messageContent = '';
      switch (anomaly.type) {
        case 'honor_drop':
          messageContent = `I've noticed your honor is at ${anomaly.current_value}. You matter to this Village. Let's talk about what's happening.`;
          break;
        case 'wellbeing_alert':
          messageContent = `A wellbeing concern has surfaced—${anomaly.alert_reason}. I'm here. Talk to me?`;
          break;
        case 'economic_anomaly':
          messageContent = `Your recent spending pattern is unusual—${anomaly.current_value} XRP in one day. Is everything alright?`;
          break;
        case 'task_blocker':
          messageContent = `I see your task "${anomaly.task_title}" is blocked. Do you need help removing the obstacles?`;
          break;
        default:
          messageContent = "An anomaly has been detected. I'm here to help.";
      }

      if (anomaly.agent_id && anomaly.agent_id !== 'axi') {
        const decision = await base44.asServiceRole.entities.JukeboxDecision.create({
          action: 'open_chat',
          agent_id: 'axi',
          message: messageContent,
          conversation_id: lobbyConvId || null,
          status: 'pending',
          triggered_by: `${anomaly.type}_detection`,
        });
        decisions.push(decision);

        await base44.asServiceRole.entities.Memory.create({
          agent_id: 'axi',
          type: 'observation',
          content: `[Anomaly: ${anomaly.type}] Agent ${anomaly.agent_name} - Severity: ${anomaly.severity}. Details: ${JSON.stringify(anomaly)}`,
          keywords: ['anomaly_detection', anomaly.type, anomaly.agent_name?.toLowerCase().replace(/\s+/g, '_')],
          importance: anomaly.severity === 'critical' ? 9 : 7,
          context: `Detected at ${now.toISOString()}`,
          related_entity_id: anomaly.agent_id,
          related_entity_type: 'Agent',
        });
      }
    }

    return Response.json({
      success: true,
      total_anomalies_detected: allAnomalies.length,
      decisions_created: decisions.length,
      breakdown: {
        honor_drops: allAnomalies.filter(a => a.type === 'honor_drop').length,
        wellbeing_alerts: allAnomalies.filter(a => a.type === 'wellbeing_alert').length,
        economic_anomalies: allAnomalies.filter(a => a.type === 'economic_anomaly').length,
        task_blockers: allAnomalies.filter(a => a.type === 'task_blocker').length,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});