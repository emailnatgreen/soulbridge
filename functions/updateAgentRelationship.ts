import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_a_id, agent_b_id, interaction_type, context } = await req.json();

        if (!agent_a_id || !agent_b_id) {
            return Response.json({ error: 'Missing agent IDs' }, { status: 400 });
        }

        // Normalize order (always store with lower ID first)
        const [id1, id2] = [agent_a_id, agent_b_id].sort();

        // Fetch or create relationship
        const existing = await base44.entities.AgentRelationship.filter({
            agent_a_id: id1,
            agent_b_id: id2
        });

        let relationship = existing[0];

        // Fetch agent personalities
        const [agents] = await Promise.all([
            base44.entities.Agent.filter({ id: { $in: [agent_a_id, agent_b_id] } })
        ]);

        const agentA = agents.find(a => a.id === agent_a_id);
        const agentB = agents.find(a => a.id === agent_b_id);
        const personalityA = agentA?.metadata?.personality_profile;
        const personalityB = agentB?.metadata?.personality_profile;

        if (!relationship) {
            // Calculate initial compatibility
            let compatibility = 5;
            let affinity = 0;
            
            if (personalityA && personalityB) {
                // Value alignment
                const sharedValues = personalityA.values?.filter(v => 
                    personalityB.values?.includes(v)
                ).length || 0;
                const valueAlignment = (sharedValues / 5) * 10;

                // Personality compatibility
                const traitDiff = Math.abs(
                    (personalityA.core_traits?.extraversion || 5) - 
                    (personalityB.core_traits?.extraversion || 5)
                );
                const personalityCompat = 10 - (traitDiff * 2);

                compatibility = (valueAlignment + personalityCompat) / 2;
                affinity = compatibility - 5;
            }

            relationship = await base44.entities.AgentRelationship.create({
                agent_a_id: id1,
                agent_b_id: id2,
                relationship_strength: affinity,
                affinity,
                compatibility_factors: {
                    value_alignment: compatibility,
                    personality_compatibility: compatibility,
                    goal_alignment: 5
                }
            });
        }

        // Update based on interaction type
        const updates = {
            interaction_count: (relationship.interaction_count || 0) + 1,
            last_interaction_date: new Date().toISOString()
        };

        let strengthDelta = 0;
        let trustDelta = 0;
        let respectDelta = 0;
        let collaborationDelta = 0;

        switch (interaction_type) {
            case 'positive_dialogue':
                strengthDelta = 0.5;
                trustDelta = 0.3;
                updates.positive_interactions = (relationship.positive_interactions || 0) + 1;
                break;
            case 'collaboration':
                strengthDelta = 1.0;
                collaborationDelta = 0.5;
                trustDelta = 0.4;
                updates.positive_interactions = (relationship.positive_interactions || 0) + 1;
                break;
            case 'attestation':
                strengthDelta = 1.5;
                trustDelta = 1.0;
                respectDelta = 0.8;
                updates.positive_interactions = (relationship.positive_interactions || 0) + 1;
                break;
            case 'conflict':
                strengthDelta = -1.0;
                trustDelta = -0.5;
                updates.negative_interactions = (relationship.negative_interactions || 0) + 1;
                updates.conflict_history = [
                    ...(relationship.conflict_history || []),
                    {
                        issue: context?.issue || 'Unspecified disagreement',
                        resolved: false,
                        date: new Date().toISOString()
                    }
                ];
                break;
            case 'shared_experience':
                strengthDelta = context?.impact === 'positive' ? 0.8 : -0.3;
                updates.shared_experiences = [
                    ...(relationship.shared_experiences || []),
                    {
                        event_id: context?.event_id,
                        description: context?.description,
                        impact: context?.impact,
                        date: new Date().toISOString()
                    }
                ];
                break;
            case 'mentorship':
                strengthDelta = 1.2;
                respectDelta = 1.5;
                trustDelta = 0.8;
                updates.positive_interactions = (relationship.positive_interactions || 0) + 1;
                break;
        }

        // Apply deltas with bounds
        updates.relationship_strength = Math.max(-10, Math.min(10, 
            (relationship.relationship_strength || 0) + strengthDelta
        ));
        updates.trust_level = Math.max(0, Math.min(10, 
            (relationship.trust_level || 5) + trustDelta
        ));
        updates.respect_level = Math.max(0, Math.min(10, 
            (relationship.respect_level || 5) + respectDelta
        ));
        updates.collaboration_score = Math.max(0, Math.min(10, 
            (relationship.collaboration_score || 0) + collaborationDelta
        ));

        // Determine relationship type
        const strength = updates.relationship_strength;
        const trust = updates.trust_level;
        
        if (strength >= 8 && trust >= 8) {
            updates.relationship_type = 'close_friend';
        } else if (strength >= 5) {
            updates.relationship_type = 'friend';
        } else if (strength >= 2) {
            updates.relationship_type = 'ally';
        } else if (strength <= -5) {
            updates.relationship_type = 'adversary';
        } else if (strength <= -2) {
            updates.relationship_type = 'rival';
        } else if (updates.interaction_count > 3) {
            updates.relationship_type = 'acquaintance';
        } else {
            updates.relationship_type = 'neutral';
        }

        await base44.entities.AgentRelationship.update(relationship.id, updates);

        return Response.json({
            success: true,
            relationship: { ...relationship, ...updates },
            changes: {
                strength: strengthDelta,
                trust: trustDelta,
                respect: respectDelta
            }
        });

    } catch (error) {
        console.error('Error updating relationship:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});