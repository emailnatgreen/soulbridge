import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Broad scan — all entities that could accumulate large docs
    const ENTITIES_TO_CHECK = [
      'Agent', 'AgentMessage', 'AgentConversation', 'Memory',
      'GovernanceProposal', 'AIProject', 'ProjectTask',
      'AgentSkill', 'MentorProfile', 'SkillDevelopmentPlan',
      'KineticUnit', 'MWTPPacket', 'SimulationState',
      'VillagePage', 'AppSettings', 'ComplianceHeartbeat',
      'AgentPerformanceMetrics', 'ReputationScore', 'AgentWellbeing',
      'CollaborativeSession', 'KnowledgeSynthesis', 'TeamSynergy',
      'AgentNotification', 'AgentTask', 'Synthesis',
      'Signal', 'AutomationLog', 'WalletAccessLog',
      'AgentState', 'SimulationEvent', 'AgentDecision',
      'Wallet', 'Transaction', 'EconomicActivity',
      'Resource', 'VillageLocation', 'TrainingModule',
      'MentorshipRelationship', 'MentorshipSession',
      'GovernanceVote', 'Treasury',
    ];

    const results = [];

    for (const entityName of ENTITIES_TO_CHECK) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list('-created_date', 50);
        
        for (const record of records) {
          const jsonStr = JSON.stringify(record);
          const sizeBytes = new TextEncoder().encode(jsonStr).length;
          const sizeMB = sizeBytes / (1024 * 1024);
          
          // Flag anything over 1MB as a concern (16MB is the hard limit)
          if (sizeMB > 1) {
            // Find the largest fields
            const fieldSizes = {};
            for (const [key, value] of Object.entries(record)) {
              const fieldStr = JSON.stringify(value);
              const fieldBytes = new TextEncoder().encode(fieldStr).length;
              if (fieldBytes > 10000) { // Only report fields > 10KB
                fieldSizes[key] = {
                  sizeKB: Math.round(fieldBytes / 1024),
                  type: Array.isArray(value) ? `array(${value.length})` : typeof value,
                };
              }
            }
            
            results.push({
              entity: entityName,
              id: record.id,
              sizeMB: parseFloat(sizeMB.toFixed(2)),
              largeFields: fieldSizes,
              created_date: record.created_date,
            });
          }
        }
      } catch (e) {
        // Entity might not exist or access denied - skip
        results.push({ entity: entityName, error: e.message?.slice(0, 100) });
      }
    }

    // Also do a broader scan — check total record counts to find bloated entities
    const entityCounts = {};
    for (const entityName of ENTITIES_TO_CHECK) {
      try {
        const all = await base44.asServiceRole.entities[entityName].list('-created_date', 1);
        // Just get one record to estimate size
        if (all.length > 0) {
          const sampleSize = new TextEncoder().encode(JSON.stringify(all[0])).length;
          entityCounts[entityName] = {
            sampleSizeKB: Math.round(sampleSize / 1024),
          };
        }
      } catch (_) { /* skip */ }
    }

    // Sort by size descending
    const flagged = results.filter(r => !r.error).sort((a, b) => (b.sizeMB || 0) - (a.sizeMB || 0));
    const errors = results.filter(r => r.error);

    return Response.json({
      flagged_records: flagged,
      flagged_count: flagged.length,
      entity_sample_sizes: entityCounts,
      scan_errors: errors,
      threshold: '1MB+ flagged (16MB = MongoDB hard limit)',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});