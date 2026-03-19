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

    // Get all Signals that need processing (limit to 20 per run)
    let signals = [];
    try {
      signals = await base44.asServiceRole.entities.Signal.list('-updated_date', 20);
    } catch (err) {
      console.warn('Failed to fetch signals:', err.message);
    }

    // Filter out signals that already have been processed (VillagePage or GovernanceProposal created)
    const processedSignals = new Set();
    try {
      const villagePages = await base44.asServiceRole.entities.VillagePage.list();
      villagePages.forEach(page => {
        if (page.metadata?.related_signal_id) {
          processedSignals.add(page.metadata.related_signal_id);
        }
      });
      
      const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ status: 'draft' });
      proposals.forEach(proposal => {
        // Extract signal ID from proposal description if it contains "Related Signal ID:"
        const match = proposal.description?.match(/Related Signal ID: ([a-f0-9]+)/);
        if (match && match[1]) {
          processedSignals.add(match[1]);
        }
      });
    } catch (err) {
      console.warn('Failed to fetch processed signals:', err.message);
    }

    const unprocessedSignals = signals.filter(s => !processedSignals.has(s.id));

    // Process each signal directly with service role authority
    for (const signal of unprocessedSignals) {
      // 1. Create memory from page signal
      try {
        const memory = await base44.asServiceRole.entities.Memory.create({
          agent_id: 'axi',
          type: 'observation',
          content: `Signal: ${signal.page_name} at ${signal.timestamp}. Findings: ${signal.metadata?.findings || 'N/A'}`,
          keywords: [signal.page_name.toLowerCase(), 'signal_processing'],
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

        // Check if already exists
        const existing = await base44.asServiceRole.entities.VillagePage.filter({ path });
        if (!existing.length) {
          const villagePage = await base44.asServiceRole.entities.VillagePage.create({
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
        }
      } catch (err) {
        console.warn(`VillagePage creation failed for signal ${signal.id}:`, err.message);
        results.executions.push({
          function: 'autoCreateVillagePageForReport',
          signal_id: signal.id,
          status: 'failed',
          error: err.message
        });
        results.failures++;
      }

      // 3. Create GovernanceProposal from signal
      try {
        const metadata = signal.metadata || {};
        const proposalTitle = `[Draft] Governance Review: ${signal.page_name || 'AI Intel Alert'}`;
        
        // Check if proposal already exists for this signal
        const existingProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ status: 'draft' });
        const alreadyExists = existingProposals.some(p => 
          p.description?.includes(`Related Signal ID: ${signal.id}`)
        );
        
        if (!alreadyExists) {
          const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
            title: proposalTitle,
            description: `
**Source Alert:** ${signal.page_name || 'AI Intelligence System'}
**Timestamp:** ${signal.timestamp}

**Key Findings:**
${metadata.findings || 'Alert received from AI intelligence system'}

**Implications:**
${metadata.implications || 'Requires governance review and Council input'}

**Recommended Initial Actions:**
${Array.isArray(metadata.recommended_actions) ? metadata.recommended_actions.map(a => `- ${a}`).join('\n') : '- Review and assess impact\n- Determine Council notification requirements'}

**Related Signal ID:** ${signal.id}
            `,
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
        }
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

    // Run aggregate/detection automations
    const aggregateFunctions = ['aggregateDashboardData', 'detectAnomalyComprehensive', 'detectAnomalyAndOutreach'];
    for (const funcName of aggregateFunctions) {
      try {
        await base44.asServiceRole.functions.invoke(funcName, {});
        results.executions.push({
          function: funcName,
          status: 'success'
        });
        results.successes++;
      } catch (err) {
        console.warn(`${funcName} failed:`, err.message);
        results.executions.push({
          function: funcName,
          status: 'failed',
          error: err.message
        });
        results.failures++;
      }
    }

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