import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all memories
    const memories = await base44.entities.Memory.list('-importance', 1000);
    
    if (!memories.length) {
      return Response.json({ 
        success: true, 
        message: 'No memories to categorize',
        memoryCount: 0 
      });
    }

    // Categorize memories by agent
    const categorization = {};
    const typeDistribution = {};
    const importanceMetrics = {};
    
    memories.forEach(mem => {
      const agentId = mem.agent_id || 'unassigned';
      const memType = mem.type || 'unknown';
      const importance = mem.importance || 5;
      
      // Agent categorization
      if (!categorization[agentId]) {
        categorization[agentId] = {
          count: 0,
          totalImportance: 0,
          avgImportance: 0,
          types: {},
          keywords: {}
        };
      }
      categorization[agentId].count++;
      categorization[agentId].totalImportance += importance;
      
      // Type tracking
      if (!categorization[agentId].types[memType]) {
        categorization[agentId].types[memType] = 0;
      }
      categorization[agentId].types[memType]++;
      
      // Keyword tracking
      if (mem.keywords && Array.isArray(mem.keywords)) {
        mem.keywords.forEach(kw => {
          if (!categorization[agentId].keywords[kw]) {
            categorization[agentId].keywords[kw] = 0;
          }
          categorization[agentId].keywords[kw]++;
        });
      }
      
      // Global type distribution
      if (!typeDistribution[memType]) {
        typeDistribution[memType] = 0;
      }
      typeDistribution[memType]++;
    });

    // Calculate averages
    Object.keys(categorization).forEach(agentId => {
      const agent = categorization[agentId];
      agent.avgImportance = (agent.totalImportance / agent.count).toFixed(2);
    });

    // Overall metrics
    const totalMemories = memories.length;
    const avgImportance = (memories.reduce((sum, m) => sum + (m.importance || 5), 0) / totalMemories).toFixed(2);
    const activeAgents = Object.keys(categorization).length;

    // Store categorization as a high-importance memory for Axi awareness
    const categorizationSummary = `Memory Categorization Update (${new Date().toISOString()})

Total Memories: ${totalMemories}
Active Agents: ${activeAgents}
Average Importance: ${avgImportance}/10

Top Agents by Memory Count:
${Object.entries(categorization)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 5)
  .map(([agentId, data]) => `- ${agentId}: ${data.count} memories (avg importance: ${data.avgImportance})`)
  .join('\n')}

Memory Type Distribution:
${Object.entries(typeDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}`;

    // Create awareness memory for Axi
    await base44.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: categorizationSummary,
      keywords: ['jukebox_categorization', 'memory_analytics', 'agent_distribution'],
      context: 'Automated memory categorization and distribution analysis for Jukebox Brain oversight',
      importance: 9,
      related_entity_type: 'System',
      related_entity_id: 'memory_categorization_job'
    });

    // Log successful categorization
    await base44.entities.AutomationLog.create({
      automation_name: 'Update Memory Categorization',
      function_name: 'updateMemoryCategorization',
      status: 'success',
      message: `Processed ${totalMemories} memories across ${activeAgents} agents`,
      details: {
        totalMemories,
        activeAgents,
        avgImportance,
        typeCount: Object.keys(typeDistribution).length
      },
      duration_ms: Date.now(),
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler'
    });

    return Response.json({
      success: true,
      message: 'Memory categorization updated successfully',
      stats: {
        totalMemories,
        activeAgents,
        avgImportance,
        typeCount: Object.keys(typeDistribution).length
      }
    });

  } catch (error) {
    console.error('Memory categorization error:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.entities.AutomationLog.create({
        automation_name: 'Update Memory Categorization',
        function_name: 'updateMemoryCategorization',
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