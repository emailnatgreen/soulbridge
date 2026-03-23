import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, apply_changes = false } = await req.json();

        const [project, tasks, risks, schedule] = await Promise.all([
            base44.entities.AIProject.get(project_id),
            base44.entities.ProjectTask.filter({ project_id }),
            base44.functions.invoke('analyzeProjectRisks', { project_id }).then(r => r.data),
            base44.functions.invoke('optimizeProjectSchedule', { project_id }).then(r => r.data)
        ]);

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const blockedTasks = tasks.filter(t => t.status === 'blocked');
        const highRisks = risks.risk_analysis?.critical_risks?.filter(r => 
            r.severity === 'high' || r.severity === 'critical'
        ) || [];

        const prompt = `You are an AI project manager for SoulBridge Village with authority to auto-adjust projects.

**Current Situation:**
- Project: ${project.title}
- Progress: ${project.progress_percentage}%
- Blocked Tasks: ${blockedTasks.length}
- High-Priority Risks: ${highRisks.length}

**Risk Analysis:**
${JSON.stringify(risks.risk_analysis, null, 2)}

**Schedule Optimization:**
${JSON.stringify(schedule.schedule_optimization, null, 2)}

Based on this analysis, recommend SPECIFIC, ACTIONABLE adjustments:

1. **Task Adjustments:** Modify priorities, reassign, or resequence tasks
2. **Resource Adjustments:** Request additional resources or reallocate existing ones
3. **Timeline Adjustments:** Extend deadlines or accelerate critical tasks
4. **Risk Mitigations:** Proactive actions to prevent identified risks
5. **Blocker Resolutions:** Unblock stuck tasks

Each adjustment should be:
- Specific and implementable
- Justified by the analysis
- Measurable in impact`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    adjustments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string" },
                                target: { type: "string" },
                                action: { type: "string" },
                                rationale: { type: "string" },
                                expected_impact: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    auto_executable: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                entity_type: { type: "string" },
                                entity_id: { type: "string" },
                                updates: { type: "object" }
                            }
                        }
                    },
                    requires_approval: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // If apply_changes is true, execute auto-executable adjustments
        const executedChanges = [];
        if (apply_changes && aiResponse.auto_executable?.length > 0) {
            for (const change of aiResponse.auto_executable) {
                if (change.entity_type === 'ProjectTask') {
                    await base44.asServiceRole.entities.ProjectTask.update(
                        change.entity_id,
                        change.updates
                    );
                    executedChanges.push(change);
                } else if (change.entity_type === 'AIProject') {
                    await base44.asServiceRole.entities.AIProject.update(
                        change.entity_id,
                        change.updates
                    );
                    executedChanges.push(change);
                }
            }

            // Notify project owner
            await base44.asServiceRole.functions.invoke('sendNotification', {
                recipient_agent_id: project.owner_agent_id,
                notification_type: 'project_update',
                title: 'AI Auto-Adjusted Project',
                message: `AI made ${executedChanges.length} optimizations to ${project.title}`,
                related_entity_type: 'AIProject',
                related_entity_id: project_id
            });
        }

        return Response.json({
            success: true,
            project_id,
            recommendations: aiResponse,
            executed_changes: executedChanges,
            changes_applied: apply_changes
        });

    } catch (error) {
        console.error('Auto-adjust error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});