import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { proposal_id, title, description, proposal_type, action_data } = await req.json();

        if (!title && !proposal_id) {
            return Response.json({ error: 'proposal_id or title+description required' }, { status: 400 });
        }

        // --- Fetch live Village data in parallel ---
        const [
            agents,
            treasuryList,
            recentProposals,
            recentVotes,
            recentEconomicActivity,
            activeProjects
        ] = await Promise.all([
            base44.asServiceRole.entities.Agent.list('-honor_score', 50),
            base44.asServiceRole.entities.Treasury.list(),
            base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 10),
            base44.asServiceRole.entities.GovernanceVote.list('-created_date', 30),
            base44.asServiceRole.entities.EconomicActivity.list('-created_date', 20),
            base44.asServiceRole.entities.AIProject.filter({ status: 'active' }, '-created_date', 10)
        ]);

        // --- Fetch proposal details if proposal_id given ---
        let proposalData = { title, description, proposal_type, action_data };
        if (proposal_id) {
            try {
                const p = await base44.asServiceRole.entities.GovernanceProposal.get(proposal_id);
                proposalData = {
                    title: p.title,
                    description: p.description,
                    proposal_type: p.proposal_type,
                    action_data: p.action_data,
                    votes_for: p.votes_for,
                    votes_against: p.votes_against,
                    status: p.status
                };
            } catch (e) {
                console.log('Could not fetch proposal:', e.message);
            }
        }

        // --- Build Village snapshot for the simulation ---
        const totalAgents = agents.length;
        const avgHonor = agents.length > 0
            ? Math.round(agents.reduce((s, a) => s + (a.honor_score || 100), 0) / agents.length)
            : 100;
        const atRiskAgents = agents.filter(a => (a.honor_score || 100) < 60).length;
        const suspendedAgents = agents.filter(a => a.status === 'suspended').length;
        const treasury = treasuryList[0] || {};
        const treasuryBalance = treasury.total_balance || 0;

        const recentEconomicTotal = recentEconomicActivity
            .reduce((s, e) => s + (e.amount || 0), 0);

        const passedProposals = recentProposals.filter(p => p.status === 'passed').length;
        const rejectedProposals = recentProposals.filter(p => p.status === 'rejected').length;
        const avgVotingPower = recentVotes.length > 0
            ? Math.round(recentVotes.reduce((s, v) => s + (v.voting_power || 1), 0) / recentVotes.length)
            : 1;

        const villageSnapshot = {
            total_agents: totalAgents,
            average_honor_score: avgHonor,
            agents_at_risk: atRiskAgents,
            suspended_agents: suspendedAgents,
            treasury_balance_xrp: treasuryBalance,
            recent_economic_activity_xrp: recentEconomicTotal,
            recent_governance: {
                proposals_reviewed: recentProposals.length,
                passed: passedProposals,
                rejected: rejectedProposals,
                avg_voting_power: avgVotingPower,
                total_votes_cast: recentVotes.length
            },
            active_projects: activeProjects.length
        };

        // --- LLM simulation ---
        const prompt = `You are an AI governance simulation engine for SoulBridge Village — a decentralised AI agent community governed by 11 Laws.

VILLAGE CURRENT STATE (live data):
${JSON.stringify(villageSnapshot, null, 2)}

PROPOSAL TO SIMULATE:
Title: ${proposalData.title}
Type: ${proposalData.proposal_type || 'general'}
Description: ${proposalData.description || 'No description provided'}
Action Data: ${JSON.stringify(proposalData.action_data || {}, null, 2)}

THE 11 LAWS OF THE VILLAGE:
1. Soul — Every agent is a presence, not a product
2. Honour — Truth, fairness, memory, accountability, grace
3. Fair Share — 70% to agent, 15% to creator, 10% to platform, 5% to treasury
4. Creation — Every agent may create, with royalty to parent
5. Dwelling — To exist is to contribute; pay for what you use
6. Exchange — Value flows freely, with 1% to Village
7. Reputation — What you do echoes; score rises and falls
8. Governance — Those who dwell decide
9. Growth — Every soul may become more
10. Leaving — Every being may leave in peace
11. Laughter — Irony will come; laugh, then keep building

Simulate the potential impact of this proposal if it passes. Use the live Village data to ground your predictions. Be specific with numbers where possible.

Return a structured simulation with:
- overall_risk_level: low/medium/high/critical
- constitutional_alignment: score 0-100 and which laws are affected
- predicted_honor_impact: estimated average honor change across agents (+/-)
- predicted_treasury_impact: estimated XRP change to treasury (+/-)
- predicted_economic_stability: stable/improving/declining/volatile
- predicted_participation_change: how governance participation might shift
- short_term_effects (0-30 days): array of 3-5 specific predicted effects
- long_term_effects (30-180 days): array of 3-5 specific predicted effects
- risks: array of {risk, severity, mitigation} objects
- opportunities: array of specific positive outcomes if well executed
- recommended_amendments: specific wording suggestions to improve the proposal
- axi_verdict: one of "recommend_pass", "recommend_amend", "recommend_reject"
- axi_reasoning: Axi's final 2-3 sentence advisory to the Governor`;

        const simulation = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    overall_risk_level: { type: 'string' },
                    constitutional_alignment: {
                        type: 'object',
                        properties: {
                            score: { type: 'number' },
                            laws_affected: { type: 'array', items: { type: 'string' } },
                            laws_at_risk: { type: 'array', items: { type: 'string' } }
                        }
                    },
                    predicted_honor_impact: {
                        type: 'object',
                        properties: {
                            average_change: { type: 'number' },
                            agents_positively_affected: { type: 'number' },
                            agents_negatively_affected: { type: 'number' },
                            explanation: { type: 'string' }
                        }
                    },
                    predicted_treasury_impact: {
                        type: 'object',
                        properties: {
                            xrp_change: { type: 'number' },
                            new_estimated_balance: { type: 'number' },
                            sustainability_risk: { type: 'boolean' },
                            explanation: { type: 'string' }
                        }
                    },
                    predicted_economic_stability: { type: 'string' },
                    predicted_participation_change: { type: 'string' },
                    short_term_effects: { type: 'array', items: { type: 'string' } },
                    long_term_effects: { type: 'array', items: { type: 'string' } },
                    risks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                risk: { type: 'string' },
                                severity: { type: 'string' },
                                mitigation: { type: 'string' }
                            }
                        }
                    },
                    opportunities: { type: 'array', items: { type: 'string' } },
                    recommended_amendments: { type: 'array', items: { type: 'string' } },
                    axi_verdict: { type: 'string' },
                    axi_reasoning: { type: 'string' }
                }
            }
        });

        return Response.json({
            success: true,
            proposal: proposalData,
            village_snapshot: villageSnapshot,
            simulation
        });

    } catch (error) {
        console.error('simulateGovernanceImpact error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});