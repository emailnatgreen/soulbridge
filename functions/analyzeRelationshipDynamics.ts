import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all relationships and agents
        const [relationships, agents] = await Promise.all([
            base44.entities.AgentRelationship.list(),
            base44.entities.Agent.list()
        ]);

        const agentMap = new Map(agents.map(a => [a.id, a]));

        // Analyze network structure
        const networkAnalysis = {
            total_relationships: relationships.length,
            strong_bonds: relationships.filter(r => r.relationship_strength >= 7).length,
            tensions: relationships.filter(r => r.relationship_strength <= -3).length,
            average_strength: relationships.reduce((sum, r) => sum + (r.relationship_strength || 0), 0) / relationships.length || 0,
            average_trust: relationships.reduce((sum, r) => sum + (r.trust_level || 5), 0) / relationships.length || 0
        };

        // Find most connected agents
        const agentConnections = new Map();
        relationships.forEach(rel => {
            agentConnections.set(rel.agent_a_id, (agentConnections.get(rel.agent_a_id) || 0) + 1);
            agentConnections.set(rel.agent_b_id, (agentConnections.get(rel.agent_b_id) || 0) + 1);
        });

        const mostConnected = Array.from(agentConnections.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([agentId, count]) => ({
                agent_name: agentMap.get(agentId)?.name,
                connections: count
            }));

        // Identify clusters/communities
        const strongBonds = relationships.filter(r => r.relationship_strength >= 6);
        const clusters = [];
        const visited = new Set();

        strongBonds.forEach(bond => {
            if (!visited.has(bond.agent_a_id) || !visited.has(bond.agent_b_id)) {
                const cluster = new Set([bond.agent_a_id, bond.agent_b_id]);
                visited.add(bond.agent_a_id);
                visited.add(bond.agent_b_id);
                
                // Find connected agents
                strongBonds.forEach(other => {
                    if (cluster.has(other.agent_a_id) || cluster.has(other.agent_b_id)) {
                        cluster.add(other.agent_a_id);
                        cluster.add(other.agent_b_id);
                    }
                });

                clusters.push({
                    size: cluster.size,
                    members: Array.from(cluster).map(id => agentMap.get(id)?.name)
                });
            }
        });

        // Find key influencers (high trust + many connections)
        const influencers = Array.from(agentConnections.entries())
            .map(([agentId, connections]) => {
                const agentRels = relationships.filter(r => 
                    r.agent_a_id === agentId || r.agent_b_id === agentId
                );
                const avgTrust = agentRels.reduce((sum, r) => sum + (r.trust_level || 0), 0) / agentRels.length || 0;
                return {
                    agent_name: agentMap.get(agentId)?.name,
                    connections,
                    average_trust: avgTrust,
                    influence_score: connections * avgTrust
                };
            })
            .sort((a, b) => b.influence_score - a.influence_score)
            .slice(0, 5);

        // Identify potential conflicts
        const conflicts = relationships
            .filter(r => r.relationship_strength <= -3 || (r.conflict_history?.length || 0) > 0)
            .map(r => ({
                agents: [
                    agentMap.get(r.agent_a_id)?.name,
                    agentMap.get(r.agent_b_id)?.name
                ],
                strength: r.relationship_strength,
                unresolved_conflicts: r.conflict_history?.filter(c => !c.resolved).length || 0
            }));

        // Relationship health metrics
        const healthMetrics = {
            overall_cohesion: networkAnalysis.average_strength,
            trust_index: networkAnalysis.average_trust,
            conflict_rate: (conflicts.length / relationships.length) * 100,
            collaboration_potential: relationships.filter(r => r.collaboration_score >= 7).length
        };

        return Response.json({
            success: true,
            network_analysis: networkAnalysis,
            most_connected: mostConnected,
            communities: clusters.sort((a, b) => b.size - a.size),
            key_influencers: influencers,
            active_tensions: conflicts,
            health_metrics: healthMetrics
        });

    } catch (error) {
        console.error('Error analyzing relationships:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});