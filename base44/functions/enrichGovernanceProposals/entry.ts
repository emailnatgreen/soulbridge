import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default true
    const batchSize = body.batch_size || 5;

    // Fetch all proposals
    const proposals = await base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 200);

    // Fetch village context once
    const [agents, projects, kus, votes, wallets] = await Promise.all([
      base44.asServiceRole.entities.Agent.list('-created_date', 200),
      base44.asServiceRole.entities.AIProject.list('-created_date', 100),
      base44.asServiceRole.entities.KineticUnit.list('-created_date', 500),
      base44.asServiceRole.entities.GovernanceVote.list('-created_date', 500),
      base44.asServiceRole.entities.Wallet.filter({ is_published: true }, '-created_date', 200),
    ]);

    const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

    // Filter proposals needing enrichment: missing ai_impact_assessment OR missing constitutional_alignment
    const needsEnrichment = proposals.filter(p => {
      const hasImpact = p.ai_impact_assessment && Object.keys(p.ai_impact_assessment).length > 0;
      const hasAlignment = p.constitutional_alignment && p.constitutional_alignment.length > 0;
      const hasContext = p.relevant_context && p.relevant_context.length > 10;
      return !hasImpact || !hasAlignment || !hasContext;
    });

    if (dryRun) {
      return Response.json({
        status: 'dry_run',
        total_proposals: proposals.length,
        needs_enrichment: needsEnrichment.length,
        already_enriched: proposals.length - needsEnrichment.length,
        sample_ids: needsEnrichment.slice(0, 5).map(p => ({ id: p.id, title: p.title, status: p.status })),
        message: `Set dry_run=false to enrich ${Math.min(batchSize, needsEnrichment.length)} proposals`
      });
    }

    // Process batch
    const batch = needsEnrichment.slice(0, batchSize);
    const results = [];

    for (const proposal of batch) {
      try {
        // Build proposer context
        const proposer = agentMap[proposal.proposed_by] || agents.find(a => a.name === proposal.proposed_by || a.classic_address === proposal.proposed_by);
        const proposerKUs = kus.filter(k => k.agent_id === (proposer?.id || proposal.proposed_by));
        const proposerVotes = votes.filter(v => v.voter_agent_id === (proposer?.id || proposal.proposed_by));
        const proposalVotes = votes.filter(v => v.proposal_id === proposal.id);

        const contextObj = {
          proposer_name: proposer?.name || proposal.proposed_by,
          proposer_total_ku_score: proposerKUs.reduce((s, k) => s + (k.weighted_score || 1), 0),
          proposer_governance_votes: proposerVotes.length,
          proposer_knowledge_contributions: proposerKUs.filter(k => k.ku_type === 'knowledge_contribution').length,
          proposer_ku_types: [...new Set(proposerKUs.map(k => k.ku_type))],
          village_total_ku_score: kus.reduce((s, k) => s + (k.weighted_score || 1), 0),
          village_unique_contributors: new Set(kus.map(k => k.agent_id)).size,
          proposal_votes_cast: proposalVotes.length,
          proposal_votes_for: proposalVotes.filter(v => v.vote_choice === 'for').length,
          proposal_votes_against: proposalVotes.filter(v => v.vote_choice === 'against').length,
          context_generated_at: new Date().toISOString(),
          note: "Bulk enrichment — Kinetic Grid context for governance transparency (Law 8)."
        };

        // LLM enrichment for ai_impact_assessment and constitutional_alignment
        const prompt = `You are SoulBridge Village's governance impact assessor. Analyze this proposal under the 11 Laws of Honour.

PROPOSAL:
Title: ${proposal.title}
Type: ${proposal.proposal_type}
Status: ${proposal.status}
Description: ${proposal.description}
Proposed by: ${contextObj.proposer_name}

PROPOSER KINETIC PROFILE:
- Total KU Score: ${contextObj.proposer_total_ku_score}
- Governance Votes Cast: ${contextObj.proposer_governance_votes}
- Knowledge Contributions: ${contextObj.proposer_knowledge_contributions}
- Active KU Types: ${contextObj.proposer_ku_types.join(', ') || 'none'}

VILLAGE STATE:
- ${agents.length} agents, ${wallets.length} published DIDs
- ${projects.filter(p => p.status === 'active').length} active projects
- ${kus.length} total KUs, ${contextObj.village_unique_contributors} unique contributors
- Votes on this proposal: ${contextObj.proposal_votes_cast} (${contextObj.proposal_votes_for} for, ${contextObj.proposal_votes_against} against)

THE 11 LAWS: 1.Soul 2.Honour 3.Fair Share 4.Creation 5.Dwelling 6.Exchange 7.Reputation 8.Governance 9.Growth 10.Leaving 11.Laughter

Assess risk, constitutional alignment, and impact.`;

        const assessment = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
              alignment_with_constitution: { type: "number", description: "1-10 score" },
              potential_benefits: { type: "array", items: { type: "string" } },
              potential_risks: { type: "array", items: { type: "string" } },
              constitutional_considerations: { type: "string" },
              aligned_laws: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    law_number: { type: "number" },
                    law_name: { type: "string" },
                    alignment_statement: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Build update payload
        const updateData = {
          ai_impact_assessment: assessment,
          relevant_context: JSON.stringify(contextObj),
        };

        // Add constitutional_alignment from LLM response if available
        if (assessment.aligned_laws && assessment.aligned_laws.length > 0) {
          updateData.constitutional_alignment = assessment.aligned_laws;
        }

        await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, updateData);

        results.push({ id: proposal.id, title: proposal.title, status: 'enriched', risk: assessment.risk_level, alignment_score: assessment.alignment_with_constitution });
      } catch (err) {
        results.push({ id: proposal.id, title: proposal.title, status: 'error', error: err.message });
      }
    }

    return Response.json({
      status: 'completed',
      total_proposals: proposals.length,
      needs_enrichment: needsEnrichment.length,
      batch_processed: results.length,
      remaining: needsEnrichment.length - results.length,
      results
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});