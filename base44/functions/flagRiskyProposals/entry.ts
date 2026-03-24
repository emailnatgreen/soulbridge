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

    const riskyProposals = [];

    for (const proposal of activeProposals) {
      const riskFactors = [];
      let riskScore = 0;

      // Risk factor 1: Low participation
      const totalVotes = (proposal.total_votes_cast || 0);
      if (totalVotes < 5) {
        riskFactors.push('Low voter participation');
        riskScore += 20;
      }

      // Risk factor 2: Extreme imbalance in votes
      const forVotes = proposal.votes_for || 0;
      const againstVotes = proposal.votes_against || 0;
      if (forVotes > 0 && againstVotes === 0) {
        riskFactors.push('No dissenting votes—potential groupthink');
        riskScore += 15;
      }

      // Risk factor 3: Unusual proposal type
      if (['agent_discipline', 'treasury_allocation'].includes(proposal.proposal_type)) {
        riskFactors.push('High-impact proposal type requires extra scrutiny');
        riskScore += 10;
      }

      // Risk factor 4: Vague description
      if (!proposal.description || proposal.description.length < 50) {
        riskFactors.push('Description too brief—insufficient detail');
        riskScore += 15;
      }

      // Risk factor 5: Proposed by new or low-honor agent
      const proposer = await base44.asServiceRole.entities.Agent.filter({
        id: proposal.proposed_by
      });

      if (proposer.length > 0) {
        const agent = proposer[0];
        if ((agent.honor_score || 100) < 60) {
          riskFactors.push('Proposer has low honor score');
          riskScore += 20;
        }
      }

      // Risk factor 6: Missing AI assessment
      if (!proposal.ai_impact_assessment) {
        riskFactors.push('No AI impact assessment—recommend adding one');
        riskScore += 10;
      }

      if (riskScore >= 30) {
        riskyProposals.push({
          proposal_id: proposal.id,
          proposal_title: proposal.title,
          proposal_type: proposal.proposal_type,
          risk_score: riskScore,
          risk_level: riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : 'medium',
          risk_factors: riskFactors,
          current_votes: {
            for: forVotes,
            against: againstVotes,
            abstain: proposal.votes_abstain || 0
          }
        });
      }
    }

    // Notify council about critical risks
    const council = await base44.asServiceRole.entities.Agent.filter({
      role: { $in: ['elder', 'guardian'] }
    });

    const criticalRisks = riskyProposals.filter(p => p.risk_level === 'critical');
    for (const risk of criticalRisks) {
      for (const councilMember of council) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: councilMember.id,
          title: '🚨 Critical Governance Risk Detected',
          content: `"${risk.proposal_title}" has a risk score of ${risk.risk_score}. Key concerns: ${risk.risk_factors.slice(0, 2).join('; ')}`,
          priority: 'critical',
          source: 'governance_risk_monitor',
          related_entity_id: risk.proposal_id,
          related_entity_type: 'GovernanceProposal'
        });
      }
    }

    return Response.json({
      status: 'success',
      proposals_analyzed: activeProposals.length,
      risky_proposals_found: riskyProposals.length,
      critical_risks: criticalRisks.length,
      proposals: riskyProposals.sort((a, b) => b.risk_score - a.risk_score)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});