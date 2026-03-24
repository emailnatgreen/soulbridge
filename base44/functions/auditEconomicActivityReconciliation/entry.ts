import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin can run this audit
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all economic activities
        const allActivities = await base44.entities.EconomicActivity.list('-created_date', 5000);
        
        // Fetch all agents for cross-reference
        const allAgents = await base44.entities.Agent.list();
        const agentIds = new Set(allAgents.map(a => a.id));

        // Audit analysis
        const audit = {
            total_records: allActivities.length,
            timestamp: new Date().toISOString(),
            by_activity_type: {},
            attribution_issues: [],
            missing_agent_id: [],
            null_amounts: [],
            orphaned_agent_ids: [],
            summary_stats: {
                total_earned: 0,
                total_spent: 0,
                total_traded: 0,
                total_treasury_ops: 0,
            },
            records_by_agent: {}
        };

        // Process each record
        allActivities.forEach(activity => {
            const type = activity.activity_type || 'unknown';
            
            // Count by type
            if (!audit.by_activity_type[type]) {
                audit.by_activity_type[type] = 0;
            }
            audit.by_activity_type[type]++;

            // Check for missing or null agent_id
            if (!activity.agent_id) {
                audit.missing_agent_id.push({
                    id: activity.id,
                    type,
                    amount: activity.amount,
                    description: activity.description,
                    created_date: activity.created_date
                });
            }

            // Check for null amounts
            if (activity.amount === null || activity.amount === undefined) {
                audit.null_amounts.push({
                    id: activity.id,
                    agent_id: activity.agent_id,
                    type,
                    created_date: activity.created_date
                });
            }

            // Check if agent_id references a valid agent
            if (activity.agent_id && !agentIds.has(activity.agent_id)) {
                audit.orphaned_agent_ids.push({
                    id: activity.id,
                    agent_id: activity.agent_id,
                    type,
                    amount: activity.amount,
                    created_date: activity.created_date
                });
            }

            // Aggregate summary stats
            if (type === 'earned') audit.summary_stats.total_earned += (activity.amount || 0);
            if (type === 'spent') audit.summary_stats.total_spent += (activity.amount || 0);
            if (type === 'traded') audit.summary_stats.total_traded += (activity.amount || 0);
            if (type.includes('treasury')) audit.summary_stats.total_treasury_ops += 1;

            // Track records by agent
            if (activity.agent_id) {
                if (!audit.records_by_agent[activity.agent_id]) {
                    audit.records_by_agent[activity.agent_id] = {
                        total: 0,
                        by_type: {},
                        total_amount: 0
                    };
                }
                audit.records_by_agent[activity.agent_id].total++;
                audit.records_by_agent[activity.agent_id].by_type[type] = (audit.records_by_agent[activity.agent_id].by_type[type] || 0) + 1;
                audit.records_by_agent[activity.agent_id].total_amount += (activity.amount || 0);
            }
        });

        return Response.json({
            success: true,
            audit,
            health_status: {
                has_missing_agent_ids: audit.missing_agent_id.length > 0,
                has_orphaned_agent_ids: audit.orphaned_agent_ids.length > 0,
                has_null_amounts: audit.null_amounts.length > 0,
                data_integrity_score: ((allActivities.length - audit.missing_agent_id.length - audit.null_amounts.length) / allActivities.length * 100).toFixed(2) + '%'
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});