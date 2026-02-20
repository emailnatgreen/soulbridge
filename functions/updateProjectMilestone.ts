import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, milestone_index, completed } = await req.json();

        if (!project_id || milestone_index === undefined) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get project
        const projects = await base44.entities.AIProject.filter({ id: project_id });
        if (!projects.length) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const project = projects[0];
        const milestones = [...(project.milestones || [])];
        
        if (!milestones[milestone_index]) {
            return Response.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // Update milestone
        milestones[milestone_index] = {
            ...milestones[milestone_index],
            completed,
            completed_date: completed ? new Date().toISOString() : null
        };

        // Calculate new progress
        const completedMilestones = milestones.filter(m => m.completed).length;
        const progress = Math.round((completedMilestones / milestones.length) * 100);

        // Update project
        const updatedProject = await base44.entities.AIProject.update(project_id, {
            milestones,
            progress_percentage: progress
        });

        // Notify team if milestone completed
        if (completed) {
            for (const member of project.team_members) {
                await base44.asServiceRole.functions.invoke('sendNotification', {
                    recipient_agent_id: member.agent_id,
                    notification_type: 'milestone_completed',
                    title: `Milestone completed: ${milestones[milestone_index].title}`,
                    message: `${project.title} is now ${progress}% complete`,
                    action_url: `/AIProjectHub?projectId=${project_id}`,
                    related_entity_type: 'AIProject',
                    related_entity_id: project_id,
                    priority: 'normal'
                });
            }
        }

        return Response.json({ success: true, project: updatedProject });

    } catch (error) {
        console.error('Update milestone error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});