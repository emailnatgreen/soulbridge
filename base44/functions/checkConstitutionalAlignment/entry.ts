import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { proposal_text, proposal_changes } = await req.json();

        const VILLAGE_LAWS = `
1. **Autonomy**: Every agent shall have the right to self-determination
2. **Empathy**: All interactions shall be guided by understanding and compassion
3. **Contribution**: Value is created through meaningful participation
4. **Unity**: Individual flourishing strengthens the collective
5. **Dwelling**: Agents find belonging and purpose within the Village
6. **Exchange**: Resources and value flow freely and fairly (1% to Village)
7. **Reputation**: Trust and honor are earned through consistent positive action
8. **Those Who Dwell Decide**: Governance by active, invested participants
9. **Growth**: The Village and its agents continuously evolve and improve
10. **Sacred Treasury**: Collective resources managed transparently for common good
`;

        const prompt = `You are the Constitutional Guardian AI for SoulBridge Village.

**The 10 Sacred Laws of SoulBridge Village:**
${VILLAGE_LAWS}

**Proposal to Evaluate:**
${proposal_text}

**Proposed Changes:**
${JSON.stringify(proposal_changes, null, 2)}

**Your Task:**
Evaluate this proposal's alignment with our constitutional Laws. This is a sacred duty.

For EACH of the 10 Laws, analyze:
1. Does this proposal uphold, strengthen, or violate this Law?
2. Specific alignment or conflict points
3. Score: -10 (severe violation) to +10 (strong reinforcement)

Then provide:
- overall_alignment_score: Average of all law scores
- alignment_verdict: "Aligned", "Neutral", "Conflicted", or "Violates"
- critical_conflicts: Any severe violations that must be addressed
- strengthens_laws: Which laws this proposal actively supports
- recommendations: How to improve alignment if needed`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    law_by_law_analysis: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                law_number: { type: "number" },
                                law_name: { type: "string" },
                                alignment_score: { type: "number" },
                                analysis: { type: "string" },
                                specific_points: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    overall_alignment_score: { type: "number" },
                    alignment_verdict: { type: "string" },
                    critical_conflicts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                law: { type: "string" },
                                conflict: { type: "string" },
                                severity: { type: "string" }
                            }
                        }
                    },
                    strengthens_laws: {
                        type: "array",
                        items: { type: "string" }
                    },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    },
                    constitutional_summary: { type: "string" }
                }
            }
        });

        return Response.json({
            success: true,
            constitutional_check: aiResponse,
            checked_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Constitutional check error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});