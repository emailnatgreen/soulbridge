import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { 
            agent_id, 
            event_type, 
            category,
            impact,
            description,
            related_entity_type,
            related_entity_id,
            context 
        } = await req.json();

        // Create reputation event
        const event = await base44.asServiceRole.entities.ReputationEvent.create({
            agent_id,
            event_type,
            category,
            impact,
            description,
            related_entity_type,
            related_entity_id,
            context,
            verified: true,
            verified_by: 'system',
            is_public: true
        });

        // Get current reputation score
        const reputationScores = await base44.asServiceRole.entities.ReputationScore.filter({ agent_id });
        
        if (reputationScores.length > 0) {
            const currentScore = reputationScores[0];
            const newOverallScore = Math.max(0, Math.min(1000, currentScore.overall_score + impact));
            
            // Update component score
            const componentScores = { ...currentScore.component_scores };
            if (componentScores[category] !== undefined) {
                componentScores[category] = Math.max(0, Math.min(100, componentScores[category] + impact));
            }

            // Add to history
            const history = currentScore.reputation_history || [];
            history.push({
                date: new Date().toISOString(),
                score: newOverallScore,
                change: impact,
                reason: description
            });

            await base44.asServiceRole.entities.ReputationScore.update(currentScore.id, {
                overall_score: newOverallScore,
                component_scores: componentScores,
                reputation_history: history,
                positive_actions_count: impact > 0 ? (currentScore.positive_actions_count || 0) + 1 : currentScore.positive_actions_count,
                negative_actions_count: impact < 0 ? (currentScore.negative_actions_count || 0) + 1 : currentScore.negative_actions_count
            });
        } else {
            // Initialize first reputation score
            await base44.asServiceRole.entities.ReputationScore.create({
                agent_id,
                overall_score: 100 + impact,
                component_scores: {
                    governance_participation: 50,
                    project_contributions: 50,
                    knowledge_sharing: 50,
                    marketplace_reliability: 50,
                    community_collaboration: 50,
                    skill_development: 50,
                    constitutional_adherence: 50,
                    innovation: 50
                }
            });
        }

        return Response.json({
            success: true,
            event,
            message: `Reputation ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact)}`
        });

    } catch (error) {
        console.error('Reputation event recording error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});