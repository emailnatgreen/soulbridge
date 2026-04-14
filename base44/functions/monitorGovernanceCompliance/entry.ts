import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by the scheduler (no user) — use service role only
    let activeProposals = [];
    try {
      activeProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
        status: 'active'
      });
    } catch (filterErr) {
      console.error('[ERROR] Failed to fetch active proposals:', filterErr.message);
      return Response.json({
        error: 'Failed to fetch governance proposals',
        details: filterErr.message,
        status: 'error'
      }, { status: 500 });
    }

    const complianceIssues = [];

    for (const proposal of activeProposals) {
      try {
        const issues = [];

        // Validate proposal has required fields
        if (!proposal || !proposal.id) {
          console.warn('[WARN] Skipping proposal with missing id field');
          continue;
        }

        // Check 1: Missing constitutional alignment
        if (!proposal.constitutional_alignment || proposal.constitutional_alignment.length === 0) {
          issues.push('No constitutional alignment documented');
        }

        // Check 2: Missing affected entities
        if (!proposal.affected_entities || proposal.affected_entities.length === 0) {
          issues.push('Affected entities not specified');
        }

        // Check 3: Missing impact assessment (defensive null/undefined check)
        if (!proposal.impact_assessment || (typeof proposal.impact_assessment === 'string' && proposal.impact_assessment.trim().length === 0)) {
          issues.push('Impact assessment missing');
        }

        // Check 4: Low quorum requirement
        if (typeof proposal.quorum_required === 'number' && proposal.quorum_required < 30) {
          issues.push('Quorum requirement suspiciously low (<30%)');
        }

        // Check 5: Unusual pass threshold
        if (typeof proposal.pass_threshold === 'number' && proposal.pass_threshold < 50) {
          issues.push('Pass threshold below simple majority');
        }

        // Check 6: Voting deadline in past (defensive date validation)
        if (proposal.voting_period_end) {
          try {
            const deadline = new Date(proposal.voting_period_end);
            if (!isNaN(deadline.getTime()) && deadline < new Date()) {
              issues.push('Voting deadline has passed but proposal still marked active');
            }
          } catch (dateErr) {
            console.warn(`[WARN] Invalid voting_period_end for proposal ${proposal.id}: ${proposal.voting_period_end}`);
          }
        }

        if (issues.length > 0) {
          complianceIssues.push({
            proposal_id: proposal.id,
            proposal_title: proposal.title,
            proposal_type: proposal.proposal_type,
            status: proposal.status,
            issues: issues,
            severity: issues.length >= 3 ? 'high' : 'medium'
          });
        }
      } catch (proposalErr) {
        console.error(`[ERROR] Processing proposal ${proposal?.id || 'unknown'}: ${proposalErr.message}`);
        // Log as warning but continue processing other proposals
        complianceIssues.push({
          proposal_id: proposal?.id || 'unknown',
          proposal_title: proposal?.title || 'Unknown',
          proposal_type: 'unknown',
          status: 'error',
          issues: [`Processing error: ${proposalErr.message}`],
          severity: 'high'
        });
      }
    }

    // Create alerts for guardians
    let guardians = [];
    try {
      guardians = await base44.asServiceRole.entities.Agent.filter({
        role: 'guardian'
      });
    } catch (guardianErr) {
      console.warn('[WARN] Failed to fetch guardians:', guardianErr.message);
    }

    const alerts = [];
    for (const issue of complianceIssues.filter(i => i.severity === 'high')) {
      for (const guardian of guardians) {
        try {
          const notification = await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: guardian.id,
            notification_type: 'governance_alert',
            title: `⚠️ Governance Compliance Alert`,
            message: `Proposal "${issue.proposal_title}" has ${issue.issues.length} compliance concerns: ${issue.issues.join('; ')}`,
            content: `Proposal "${issue.proposal_title}" has ${issue.issues.length} compliance concerns: ${issue.issues.join('; ')}`,
            priority: 'high',
            source: 'governance_monitor',
            related_entity_id: issue.proposal_id,
            related_entity_type: 'GovernanceProposal'
          });
          alerts.push(notification);
        } catch (notifErr) {
          console.error(`[ERROR] Failed to create notification for guardian ${guardian?.id}: ${notifErr.message}`);
        }
      }
    }

    return Response.json({
      status: 'success',
      proposals_audited: activeProposals.length,
      compliance_issues_found: complianceIssues.length,
      high_severity_issues: complianceIssues.filter(i => i.severity === 'high').length,
      alerts_created: alerts.length,
      issues: complianceIssues
    });
  } catch (error) {
    console.error('[CRITICAL ERROR] monitorGovernanceCompliance failed:', error.stack || error.message);
    return Response.json({
      error: 'Governance compliance monitoring failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});