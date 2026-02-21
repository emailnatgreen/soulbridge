import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { category, limit = 50 } = await req.json();

        const [reputationScores, agents] = await Promise.all([
            base44.entities.ReputationScore.list('-overall_score', limit),
            base44.entities.Agent.list()
        ]);

        let rankedScores = reputationScores;

        // Filter by category if specified
        if (category && category !== 'overall') {
            rankedScores = reputationScores.sort((a, b) => {
                const scoreA = a.component_scores?.[category] || 0;
                const scoreB = b.component_scores?.[category] || 0;
                return scoreB - scoreA;
            });
        }

        const leaderboard = rankedScores.map((score, index) => {
            const agent = agents.find(a => a.id === score.agent_id);
            return {
                rank: index + 1,
                agent_id: score.agent_id,
                agent_name: agent?.name || 'Unknown',
                agent_role: agent?.role || 'unknown',
                overall_score: score.overall_score,
                honor_level: score.honor_level,
                component_score: category && category !== 'overall' 
                    ? score.component_scores?.[category] 
                    : score.overall_score,
                badges_count: score.badges_earned?.length || 0,
                growth_trajectory: score.growth_trajectory,
                voting_power: score.voting_power_multiplier
            };
        });

        // Statistics
        const stats = {
            total_agents: reputationScores.length,
            avg_score: reputationScores.reduce((sum, s) => sum + s.overall_score, 0) / reputationScores.length,
            honor_levels: {
                legendary: reputationScores.filter(s => s.honor_level === 'legendary').length,
                revered: reputationScores.filter(s => s.honor_level === 'revered').length,
                honored: reputationScores.filter(s => s.honor_level === 'honored').length,
                respected: reputationScores.filter(s => s.honor_level === 'respected').length,
                trusted: reputationScores.filter(s => s.honor_level === 'trusted').length,
                newcomer: reputationScores.filter(s => s.honor_level === 'newcomer').length
            }
        };

        return Response.json({
            success: true,
            leaderboard,
            stats,
            category: category || 'overall'
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});