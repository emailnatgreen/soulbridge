import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const activeProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      status: 'active'
    });

    const complianceIssues = [];

    for (const proposal of activeProposals) {
      const issues = [];

      // Check 1: Missing constitutional alignment
      if (!proposal.constitutional_alignment || proposal.constitutional_alignment.length === 0) {
        issues.push('No constitutional alignment documented');
      }

      // Check 2: Missing affected entities
      if (!proposal.affected_entities || proposal.affected_entities.length === 0) {
        issues.push('Affected entities not specified');
      }

      // Check 3: Missing impact assessment
      if (!proposal.impact_assessment || proposal.impact_assessment.trim().length === 0) {
        issues.push('Impact assessment missing');
      }

      // Check 4: Low quorum requirement
      if (proposal.quorum_required < 30) {
        issues.push('Quorum requirement suspiciously low (<30%)');
      }

      // Check 5: Unusual pass threshold
      if (proposal.pass_threshold < 50) {
        issues.push('Pass threshold below simple majority');
      }

      // Check 6: Voting deadline in past
      const deadline = new Date(proposal.voting_period_end);
      if (deadline < new Date()) {
        issues.push('Voting deadline has passed but proposal still marked active');
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
    }

    // Create alerts for guardians
    const guardians = await base44.asServiceRole.entities.Agent.filter({
      role: 'guardian'
    });

    const alerts = [];
    for (const issue of complianceIssues.filter(i => i.severity === 'high')) {
      for (const guardian of guardians) {
        const notification = await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: guardian.id,
          title: `⚠️ Governance Compliance Alert`,
          content: `Proposal "${issue.proposal_title}" has ${issue.issues.length} compliance concerns: ${issue.issues.join('; ')}`,
          priority: 'high',
          source: 'governance_monitor',
          related_entity_id: issue.proposal_id,
          related_entity_type: 'GovernanceProposal'
        });
        alerts.push(notification);
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});