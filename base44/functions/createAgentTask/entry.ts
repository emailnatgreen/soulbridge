import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const taskData = await req.json();
        const { 
            delegator_agent_id, 
            assignee_agent_id, 
            title, 
            description,
            task_type = 'custom',
            priority = 'medium',
            due_date,
            required_skills = [],
            reward = {},
            related_project_id
        } = taskData;

        if (!delegator_agent_id || !assignee_agent_id || !title || !description) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get both agents
        const [delegator, assignee] = await Promise.all([
            base44.entities.Agent.get(delegator_agent_id),
            base44.entities.Agent.get(assignee_agent_id)
        ]);

        // Check if assignee has required skills (optional validation)
        if (required_skills.length > 0) {
            const assigneeSkills = await base44.entities.AgentSkill.filter({
                agent_id: assignee_agent_id
            });
            const hasSkills = required_skills.every(reqSkill => 
                assigneeSkills.some(skill => skill.skill_id === reqSkill)
            );
            
            if (!hasSkills) {
                console.log('Warning: Assignee may not have all required skills');
            }
        }

        // Create task
        const task = await base44.asServiceRole.entities.AgentTask.create({
            title,
            description,
            delegator_agent_id,
            assignee_agent_id,
            task_type,
            priority,
            status: 'pending',
            progress_percentage: 0,
            due_date,
            required_skills,
            reward,
            related_project_id,
            progress_updates: []
        });

        // Create notification for assignee
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: assignee_agent_id,
            notification_type: 'system',
            title: `New Task: ${title}`,
            message: `${delegator.name} has delegated a task to you: ${description.substring(0, 100)}`,
            sender_agent_id: delegator_agent_id,
            priority: priority === 'critical' ? 'high' : 'normal'
        });

        return Response.json({ 
            task,
            message: 'Task created and delegated successfully'
        });
    } catch (error) {
        console.error('Error creating task:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});