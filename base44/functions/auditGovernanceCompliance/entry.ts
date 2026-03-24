import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active proposals
    const activeProposals = await base44.entities.GovernanceProposal.filter({ status: 'active' });
    
    const auditResults = [];
    const complianceIssues = [];

    // Audit each proposal
    for (const proposal of activeProposals) {
      try {
        // Check compliance via LLM
        const complianceCheck = await base44.integrations.Core.InvokeLLM({
          prompt: `Quickly assess if this governance proposal complies with core principles of integrity, transparency, and fairness. Rate 1-10.

Title: ${proposal.title}
Type: ${proposal.proposal_type}
Description: ${proposal.description}

Return JSON only: {"compliance_score": <1-10>, "has_issues": <true/false>, "issues": ["<issue1>", "<issue2>"]}`,
          response_json_schema: {
            type: "object",
            properties: {
              compliance_score: { type: "number" },
              has_issues: { type: "boolean" },
              issues: { type: "array", items: { type: "string" } }
            }
          }
        });

        auditResults.push({
          proposal_id: proposal.id,
          title: proposal.title,
          compliance_score: complianceCheck.compliance_score,
          has_issues: complianceCheck.has_issues,
          issues: complianceCheck.issues || []
        });

        if (complianceCheck.has_issues) {
          complianceIssues.push({
            proposal_id: proposal.id,
            proposal_title: proposal.title,
            issues: complianceCheck.issues,
            severity: complianceCheck.compliance_score < 5 ? 'high' : 'medium'
          });
        }
      } catch (err) {
        console.error(`Error auditing proposal ${proposal.id}:`, err.message);
      }
    }

    // Notify guardians of critical issues
    if (complianceIssues.length > 0) {
      const guardians = await base44.entities.Agent.filter({ role: 'guardian' });
      
      const notifications = guardians.map(guardian => ({
        recipient_agent_id: guardian.id,
        sender_agent_id: 'axi-system',
        notification_type: 'governance_compliance_alert',
        title: 'Governance Compliance Audit Alert',
        message: `${complianceIssues.length} proposal(s) with compliance issues detected. Review required.`,
        related_entity_type: 'GovernanceProposal',
        priority: complianceIssues.some(i => i.severity === 'high') ? 'high' : 'normal',
        is_read: false
      }));

      if (notifications.length > 0) {
        await base44.entities.AgentNotification.bulkCreate(notifications);
      }
    }

    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      proposals_audited: activeProposals.length,
      compliance_issues_found: complianceIssues.length,
      audit_results: auditResults,
      compliance_issues: complianceIssues,
      message: `Governance compliance audit complete. ${complianceIssues.length} issue(s) flagged.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});