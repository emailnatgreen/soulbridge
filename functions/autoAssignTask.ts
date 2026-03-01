import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_id } = await req.json();
        if (!task_id) {
            return Response.json({ error: 'Missing task_id' }, { status: 400 });
        }

        // Fetch the task
        const task = await base44.asServiceRole.entities.ProjectTask.get(task_id);
        if (!task) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        // Skip if already assigned
        if (task.assigned_agent_id) {
            return Response.json({ message: 'Task already assigned', assigned_agent_id: task.assigned_agent_id });
        }

        // Fetch project for priority context
        const project = await base44.asServiceRole.entities.AIProject.get(task.project_id);
        const projectPriority = { low: 1, medium: 2, high: 3, critical: 4 }[project?.priority || 'medium'];

        // Fetch all active agents
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        if (!agents || agents.length === 0) {
            return Response.json({ error: 'No active agents available' });
        }

        // Fetch current workloads (in_progress tasks per agent)
        const inProgressTasks = await base44.asServiceRole.entities.ProjectTask.filter({ status: 'in_progress' });
        const workloadMap = {};
        for (const t of inProgressTasks) {
            if (t.assigned_agent_id) {
                workloadMap[t.assigned_agent_id] = (workloadMap[t.assigned_agent_id] || 0) + 1;
            }
        }

        // Build task keyword set for specialization matching
        const taskKeywords = [
            ...(task.title || '').toLowerCase().split(/\s+/),
            ...(task.description || '').toLowerCase().split(/\s+/),
            task.task_type || ''
        ];

        // Score each agent
        const taskTypeToSpecialization = {
            compliance: ['compliance', 'legal', 'audit', 'governance', 'regulatory'],
            scouting: ['scout', 'research', 'analysis', 'intelligence', 'exploration'],
            storytelling: ['story', 'creative', 'content', 'narrative', 'writing', 'communication'],
            development: ['development', 'technical', 'code', 'build', 'engineering'],
            research: ['research', 'analysis', 'data', 'knowledge', 'learning'],
            other: []
        };
        const relevantSpecializations = taskTypeToSpecialization[task.task_type] || [];

        const scoredAgents = agents.map(agent => {
            let score = 0;

            // 1. Specialization match (0-40 points)
            const agentSpecializations = (agent.specializations || []).map(s => s.toLowerCase());
            const agentPurpose = (agent.purpose || '').toLowerCase();
            const agentBio = (agent.bio || '').toLowerCase();

            for (const spec of relevantSpecializations) {
                if (agentSpecializations.some(s => s.includes(spec))) score += 10;
                if (agentPurpose.includes(spec)) score += 5;
                if (agentBio.includes(spec)) score += 2;
            }

            // Also match task keywords against agent profile
            for (const kw of taskKeywords) {
                if (kw.length < 4) continue;
                if (agentSpecializations.some(s => s.includes(kw))) score += 3;
                if (agentPurpose.includes(kw)) score += 2;
            }
            score = Math.min(score, 40);

            // 2. Honor score (0-30 points)
            const honor = agent.honor_score || 100;
            score += Math.round((honor / 100) * 30);

            // 3. Workload penalty (0-20 points, lower workload = higher score)
            const workload = workloadMap[agent.id] || 0;
            const workloadScore = Math.max(0, 20 - workload * 4);
            score += workloadScore;

            // 4. Availability bonus (0-10 points)
            if (agent.availability_status === 'available') score += 10;
            else if (agent.availability_status === 'busy') score += 3;

            return { agent, score, workload };
        });

        // Sort by score descending
        scoredAgents.sort((a, b) => b.score - a.score);
        const best = scoredAgents[0];

        if (!best) {
            return Response.json({ error: 'Could not determine suitable agent' });
        }

        // Assign the task
        await base44.asServiceRole.entities.ProjectTask.update(task_id, {
            assigned_agent_id: best.agent.id
        });

        // Send notification to the assigned agent
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: best.agent.id,
            notification_type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been auto-assigned to: "${task.title}". Project priority: ${project?.priority || 'medium'}. Current workload: ${best.workload} active tasks.`,
            related_entity_type: 'ProjectTask',
            related_entity_id: task_id,
            priority: projectPriority >= 3 ? 'high' : 'normal'
        });

        return Response.json({
            success: true,
            assigned_agent_id: best.agent.id,
            assigned_agent_name: best.agent.name,
            score: best.score,
            workload: best.workload,
            message: `Task assigned to ${best.agent.name} (score: ${best.score})`
        });

    } catch (error) {
        console.error('autoAssignTask error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});