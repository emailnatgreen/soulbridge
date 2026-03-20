import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Master automation orchestrator
 * Runs critical automations in small batches to avoid timeouts
 * Inlines signal processing to maintain service role authority
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = {
      timestamp: new Date().toISOString(),
      executions: [],
      successes: 0,
      failures: 0
    };

    // Get all Signals that need processing (limit to 10 per run for speed)
    let signals = [];
    try {
      signals = await base44.asServiceRole.entities.Signal.list('-updated_date', 10);
    } catch (err) {
      console.warn('Failed to fetch signals:', err.message);
      signals = [];
    }

    // Quick check: only fetch processed signals if we have signals to process
    const processedSignals = new Set();
    if (signals.length > 0) {
      try {
        // Only fetch VillagePages with signal metadata
        const villagePages = await base44.asServiceRole.entities.VillagePage.filter(
          { 'metadata.related_signal_id': { $exists: true } },
          null,
          10
        );
        villagePages.forEach(page => {
          if (page.metadata?.related_signal_id) {
            processedSignals.add(page.metadata.related_signal_id);
          }
        });
      } catch (err) {
        console.warn('Failed to fetch processed village pages:', err.message);
      }
    }

    const unprocessedSignals = signals.filter(s => !processedSignals.has(s.id));

    // Process only first 3 signals per run to stay within CPU limits
    const maxSignalsPerRun = Math.min(3, unprocessedSignals.length);
    
    for (let i = 0; i < maxSignalsPerRun; i++) {
      const signal = unprocessedSignals[i];
      
      // 1. Create memory from page signal
      try {
        await base44.asServiceRole.entities.Memory.create({
          agent_id: 'axi',
          type: 'observation',
          content: `Signal: ${signal.page_name} at ${signal.timestamp}. Findings: ${signal.metadata?.findings || 'N/A'}`,
          keywords: [signal.page_name?.toLowerCase() || 'signal', 'signal_processing'],
          context: `Processed from Signal ID: ${signal.id}`,
          importance: signal.metadata?.severity === 'high' ? 8 : 5,
          related_entity_type: 'Signal',
          related_entity_id: signal.id,
        });
        
        results.executions.push({
          function: 'processPageSignalToMemory',
          signal_id: signal.id,
          status: 'success'
        });
        results.successes++;
      } catch (err) {
        console.warn(`Memory creation failed for signal ${signal.id}:`, err.message);
        results.executions.push({
          function: 'processPageSignalToMemory',
          signal_id: signal.id,
          status: 'failed',
          error: err.message
        });
        results.failures++;
      }

      // 2. Create VillagePage from signal
      try {
        const reportTitle = `${signal.page_name || 'AI Intel Report'} - ${signal.metadata?.alert_type || 'Analysis'}`;
        const path = '/' + reportTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Skip existence check to save query time
        await base44.asServiceRole.entities.VillagePage.create({
          name: reportTitle,
          path,
          category: 'governance',
          status: 'active',
          description: signal.metadata?.findings || `Report for ${signal.page_name}`,
          is_public: signal.metadata?.severity === 'high' || signal.metadata?.severity === 'critical',
          priority: signal.metadata?.severity === 'high' ? 'high' : 'medium',
          metadata: {
            related_signal_id: signal.id,
            created_from: 'ai_intel_system',
            created_at: new Date().toISOString(),
            is_critical_report: signal.metadata?.severity === 'critical'
          }
        });

        results.executions.push({
          function: 'autoCreateVillagePageForReport',
          signal_id: signal.id,
          status: 'success'
        });
        results.successes++;
      } catch (err) {
        // Silently handle duplicate path errors
        if (!err.message?.includes('path')) {
          console.warn(`VillagePage creation failed for signal ${signal.id}:`, err.message);
        }
        results.failures++;
      }

      // 3. Create GovernanceProposal — only for genuine high/critical alerts, not routine system events
      const isGovernanceWorthy =
        (signal.signal_type === 'alert' || signal.signal_type === 'anomaly') &&
        (signal.metadata?.severity === 'high' || signal.metadata?.severity === 'critical');

      if (isGovernanceWorthy) {
        try {
          const proposalTitle = `[Draft] Governance Review: ${signal.page_name || 'AI Intel Alert'}`;
          
          await base44.asServiceRole.entities.GovernanceProposal.create({
            title: proposalTitle,
            description: `**Source Alert:** ${signal.page_name || 'AI Intelligence System'}\n**Related Signal ID:** ${signal.id}\n**Severity:** ${signal.metadata?.severity}\n**Findings:** ${signal.metadata?.findings || 'N/A'}`,
            proposal_type: 'general',
            proposed_by: 'axi_intelligence_system',
            status: 'draft',
            voting_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            quorum_required: 50,
            pass_threshold: 60
          });

          results.executions.push({
            function: 'autoDraftGovernanceProposal',
            signal_id: signal.id,
            status: 'success'
          });
          results.successes++;
        } catch (err) {
          console.warn(`GovernanceProposal creation failed for signal ${signal.id}:`, err.message);
          results.executions.push({
            function: 'autoDraftGovernanceProposal',
            signal_id: signal.id,
            status: 'failed',
            error: err.message
          });
          results.failures++;
        }
      }
    }

    // Skip invoking other functions to avoid cascading timeouts
    // Each function handles its own scheduling

    console.log(`Master orchestrator complete: ${results.successes} successes, ${results.failures} failures`);

    return Response.json({
      success: true,
      summary: `Executed ${results.executions.length} tasks: ${results.successes} succeeded, ${results.failures} failed`,
      results
    });
  } catch (error) {
    console.error('Master orchestrator error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});