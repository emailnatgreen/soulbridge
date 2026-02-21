import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [agents, wellbeingRecords, alerts, reputationScores, performances] = await Promise.all([
            base44.entities.Agent.list(),
            base44.entities.AgentWellbeing.list('-created_date', 200),
            base44.entities.WellbeingAlert.filter({ status: 'active' }),
            base44.entities.ReputationScore.list(),
            base44.entities.AgentPerformanceMetrics.list('-created_date', 100)
        ]);

        const atRiskAgents = [];

        for (const agent of agents) {
            const agentWellbeing = wellbeingRecords.filter(w => w.agent_id === agent.id);
            const latestWellbeing = agentWellbeing[0];
            const agentAlerts = alerts.filter(a => a.agent_id === agent.id);
            const agentReputation = reputationScores.find(r => r.agent_id === agent.id);
            const agentPerformance = performances.filter(p => p.agent_id === agent.id)[0];

            const riskFactors = [];
            let riskScore = 0;

            // Check wellbeing score
            if (latestWellbeing && latestWellbeing.overall_wellbeing_score < 40) {
                riskFactors.push('Low wellbeing score');
                riskScore += 30;
            }

            // Check burnout indicators
            if (latestWellbeing && latestWellbeing.stress_indicators?.burnout_risk > 7) {
                riskFactors.push('High burnout risk');
                riskScore += 40;
            }

            // Check active alerts
            if (agentAlerts.length > 0) {
                riskFactors.push(`${agentAlerts.length} active wellbeing alerts`);
                riskScore += agentAlerts.length * 15;
            }

            // Check declining reputation
            if (agentReputation && agentReputation.growth_trajectory === 'declining') {
                riskFactors.push('Declining reputation');
                riskScore += 20;
            }

            // Check performance issues
            if (agentPerformance && agentPerformance.overall_score < 50) {
                riskFactors.push('Low performance score');
                riskScore += 25;
            }

            // Check social isolation
            if (latestWellbeing && latestWellbeing.dimensions?.social_connection < 40) {
                riskFactors.push('Social isolation');
                riskScore += 20;
            }

            if (riskScore > 30) {
                atRiskAgents.push({
                    agent_id: agent.id,
                    agent_name: agent.name,
                    agent_role: agent.role,
                    risk_score: Math.min(100, riskScore),
                    risk_level: riskScore > 70 ? 'critical' : riskScore > 50 ? 'high' : 'medium',
                    risk_factors: riskFactors,
                    wellbeing_score: latestWellbeing?.overall_wellbeing_score || 0,
                    burnout_risk: latestWellbeing?.stress_indicators?.burnout_risk || 0,
                    active_alerts: agentAlerts.length,
                    last_assessment: latestWellbeing?.created_date
                });
            }
        }

        atRiskAgents.sort((a, b) => b.risk_score - a.risk_score);

        return Response.json({
            success: true,
            at_risk_agents: atRiskAgents,
            total_at_risk: atRiskAgents.length,
            critical_count: atRiskAgents.filter(a => a.risk_level === 'critical').length,
            high_count: atRiskAgents.filter(a => a.risk_level === 'high').length,
            identified_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('At-risk identification error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});