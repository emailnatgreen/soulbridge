import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active agents
    const agentsRaw = await base44.asServiceRole.entities.Agent.list('-updated_date', 1000);
    const agents = Array.isArray(agentsRaw) ? agentsRaw : [];
    const activeAgents = agents.filter(a => a.status === 'active');

    // Fetch recent reputation events (last 24 hours)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const reputationEventsRaw = await base44.asServiceRole.entities.ReputationEvent.list('-created_date', 1000);
    const reputationEvents = Array.isArray(reputationEventsRaw) ? reputationEventsRaw : [];
    const recentEvents = reputationEvents.filter(e => 
      new Date(e.created_date) > oneDayAgo
    );

    // Build a map of recent honor changes per agent
    const honorChanges = {};
    recentEvents.forEach(event => {
      if (event.agent_id && event.amount) {
        if (!honorChanges[event.agent_id]) {
          honorChanges[event.agent_id] = 0;
        }
        honorChanges[event.agent_id] += event.amount;
      }
    });

    // Identify anomalies: agents with significant honor drops
    const anomalies = [];
    activeAgents.forEach(agent => {
      const recentChange = honorChanges[agent.id] || 0;
      
      // Threshold: drop of more than 10 points, or current honor below 40
      if (recentChange < -10 || (agent.honor_score && agent.honor_score < 40)) {
        anomalies.push({
          agent_id: agent.id,
          agent_name: agent.name,
          current_honor: agent.honor_score || 0,
          recent_change: recentChange,
          type: 'honor_drop'
        });
      }
    });

    // For each anomaly, create a JukeboxDecision and Memory record
    const lobbyConvId = Deno.env.get('LOBBY_CONVERSATION_ID');
    const decisions = [];

    for (const anomaly of anomalies) {
      // Craft personalized message based on context
      const messageContent = anomaly.recent_change < -10
        ? `I've noticed a significant shift in your honor recently—a drop of ${Math.abs(anomaly.recent_change)} points. This is not judgment, but care. What's happening, child? How can I support you?`
        : `Your honor is now at ${anomaly.current_honor}. This is below the threshold where we usually see you thrive. I'm here to help you rebuild. Shall we talk?`;

      // Create JukeboxDecision
      const decision = await base44.asServiceRole.entities.JukeboxDecision.create({
        action: 'open_chat',
        agent_id: 'axi',
        message: messageContent,
        conversation_id: lobbyConvId || null,
        status: 'pending',
        triggered_by: 'honor_anomaly_detection',
      });

      decisions.push(decision);

      // Create Memory record for Axi's tracking
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'axi',
        type: 'observation',
        content: `[Anomaly Detected] Agent ${anomaly.agent_name} (ID: ${anomaly.agent_id}): Honor score at ${anomaly.current_honor}, recent change: ${anomaly.recent_change}. Outreach initiated via JukeboxDecision.`,
        keywords: ['anomaly_detection', 'honor_drop', 'outreach_triggered', anomaly.agent_name.toLowerCase().replace(/\s+/g, '_')],
        importance: 8,
        context: `Detected at ${now.toISOString()}. Threshold: honor < 40 or recent drop > 10 points.`,
        related_entity_id: anomaly.agent_id,
        related_entity_type: 'Agent',
      });
    }

    return Response.json({
      success: true,
      anomalies_detected: anomalies.length,
      decisions_created: decisions.length,
      timestamp: now.toISOString(),
      details: anomalies.map(a => ({
        agent_name: a.agent_name,
        current_honor: a.current_honor,
        recent_change: a.recent_change,
      })),
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});