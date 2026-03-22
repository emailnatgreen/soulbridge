import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch recent memories (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentMemories = await base44.entities.Memory.filter({}, '-created_date', 200);
    const last24h = recentMemories.filter(m => m.created_date >= oneDayAgo);

    // Get all memories for baseline
    const allMemories = await base44.entities.Memory.list('-created_date', 1000);

    // Calculate statistics
    const agentActivityToday = {};
    const agentActivityOverall = {};

    last24h.forEach(m => {
      const agent = m.agent_id || 'unassigned';
      agentActivityToday[agent] = (agentActivityToday[agent] || 0) + 1;
    });

    allMemories.forEach(m => {
      const agent = m.agent_id || 'unassigned';
      agentActivityOverall[agent] = (agentActivityOverall[agent] || 0) + 1;
    });

    // Detect anomalies
    const anomalies = [];
    const avgMemoriesPerAgent = allMemories.length / Object.keys(agentActivityOverall).length;
    const avgPercentageIncrease = 0.3; // 30% is normal

    for (const [agent, todayCount] of Object.entries(agentActivityToday)) {
      const overallCount = agentActivityOverall[agent] || 0;
      const totalMemories = allMemories.length;
      const expectedDaily = (overallCount / totalMemories) * last24h.length;
      const percentageIncrease = (todayCount - expectedDaily) / (expectedDaily || 1);

      // Anomaly: 50% more activity than expected
      if (percentageIncrease > 0.5) {
        anomalies.push({
          type: 'activity_surge',
          agent,
          todayCount,
          expectedDaily: Math.round(expectedDaily),
          severity: percentageIncrease > 1 ? 'high' : 'medium'
        });
      }

      // Anomaly: Silent agent (should have activity but doesn't)
      if (overallCount > avgMemoriesPerAgent * 2 && todayCount === 0) {
        anomalies.push({
          type: 'silent_agent',
          agent,
          historicalCount: overallCount,
          severity: 'medium'
        });
      }
    }

    // Check for keyword spikes
    const keywordCount = {};
    last24h.forEach(m => {
      if (m.keywords && Array.isArray(m.keywords)) {
        m.keywords.forEach(kw => {
          keywordCount[kw] = (keywordCount[kw] || 0) + 1;
        });
      }
    });

    const topKeywords = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Create anomaly report
    const anomalyReport = `Memory Anomaly Detection Report (${new Date().toISOString()})

Timeframe: Last 24 hours
Memories Analyzed: ${last24h.length}
Total Memories: ${allMemories.length}

DETECTED ANOMALIES: ${anomalies.length}
${anomalies.length > 0 ? 
  anomalies.map(a => {
    if (a.type === 'activity_surge') {
      return `- [${a.severity.toUpperCase()}] Activity Surge: ${a.agent} (${a.todayCount} vs expected ${a.expectedDaily})`;
    } else if (a.type === 'silent_agent') {
      return `- [${a.severity.toUpperCase()}] Silent Agent: ${a.agent} (historical: ${a.historicalCount}, today: 0)`;
    }
  }).join('\n')
  : '✓ No anomalies detected'}

Top Keywords (Last 24h):
${topKeywords.map(([kw, count]) => `- ${kw}: ${count}`).join('\n')}`;

    // Send notifications for high-severity anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high') {
        await base44.entities.AgentNotification.create({
          recipient_agent_id: 'axi',
          notification_type: 'system',
          title: `Memory Anomaly Detected: ${anomaly.agent}`,
          message: `${anomaly.agent} showed unusual activity patterns (${anomaly.todayCount} vs ${Math.round(anomaly.expectedDaily)} expected)`,
          priority: 'high',
          related_entity_type: 'Memory',
          related_entity_id: anomaly.agent
        });
      }
    }

    // Create anomaly report memory
    await base44.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: anomalyReport,
      keywords: ['anomaly_detection', 'trend_analysis', 'activity_monitoring'],
      context: 'Continuous monitoring of memory patterns and agent activity',
      importance: 8,
      related_entity_type: 'System',
      related_entity_id: 'anomaly_detection_job'
    });

    // Log the operation
    await base44.entities.AutomationLog.create({
      automation_name: 'Detect Memory Anomalies',
      function_name: 'detectMemoryAnomalies',
      status: 'success',
      message: `Detected ${anomalies.length} anomalies in last 24h`,
      details: {
        anomaliesFound: anomalies.length,
        last24hCount: last24h.length,
        topKeywords: topKeywords.map(([kw]) => kw)
      },
      duration_ms: Date.now(),
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler'
    });

    return Response.json({
      success: true,
      message: `Anomaly detection complete: ${anomalies.length} anomalies found`,
      anomalies,
      stats: {
        last24hMemories: last24h.length,
        anomaliesFound: anomalies.length,
        topKeywords: topKeywords.map(([kw, count]) => ({ keyword: kw, count }))
      }
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.entities.AutomationLog.create({
        automation_name: 'Detect Memory Anomalies',
        function_name: 'detectMemoryAnomalies',
        status: 'error',
        message: error.message,
        error_detail: error.stack,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler'
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});