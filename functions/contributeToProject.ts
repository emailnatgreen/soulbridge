import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { project_id, agent_id, resource_id, effort_hours = 1 } = await req.json();

        if (!project_id || !agent_id || !resource_id) {
            return Response.json({
                error: 'project_id, agent_id, and resource_id are required'
            }, { status: 400 });
        }

        const [project, agent, resource] = await Promise.all([
            base44.asServiceRole.entities.VillageProject.get(project_id),
            base44.asServiceRole.entities.Agent.get(agent_id),
            base44.asServiceRole.entities.Resource.get(resource_id)
        ]);

        if (!project || !agent || !resource) {
            return Response.json({ error: 'Project, agent, or resource not found' }, { status: 404 });
        }

        if (resource.owner_agent_id !== agent_id) {
            return Response.json({ error: 'Agent does not own this resource' }, { status: 403 });
        }

        if (project.status === 'completed') {
            return Response.json({ error: 'Project already completed' }, { status: 400 });
        }

        // Track contribution
        const contribution = await base44.asServiceRole.entities.ProjectContribution.create({
            project_id,
            agent_id,
            resource_type: resource.type,
            resource_amount: resource.quantity,
            effort_hours,
            description: `${agent.name} contributed ${resource.quantity} ${resource.type} to ${project.name}`,
            status: 'pending'
        });

        // Update project resources
        const currentResources = project.resources_gathered || {};
        currentResources[resource.type] = (currentResources[resource.type] || 0) + resource.quantity;

        // Calculate progress
        let progress = 0;
        let resourcesMet = 0;
        const totalNeeded = Object.keys(project.required_resources).length;

        for (const [type, needed] of Object.entries(project.required_resources)) {
            const gathered = currentResources[type] || 0;
            if (gathered >= needed) {
                resourcesMet++;
            }
        }

        progress = Math.round((resourcesMet / totalNeeded) * 100);

        // Check if project is complete
        let newStatus = project.status;
        if (progress === 100) {
            newStatus = 'completed';
            // Award XRP to all contributors
            const allContributions = await base44.asServiceRole.entities.ProjectContribution.filter(
                { project_id },
                '-created_date',
                1000
            );
            const uniqueContributors = [...new Set(allContributions.map(c => c.agent_id))];
            const rewardPerAgent = project.reward_xrp / uniqueContributors.length;

            for (const contributorId of uniqueContributors) {
                await base44.asServiceRole.entities.EconomicActivity.create({
                    agent_id: contributorId,
                    activity_type: 'earned',
                    amount: rewardPerAgent,
                    description: `Completed project: ${project.name}`
                });
            }
        }

        // Update contributors list
        const contributors = project.contributors || [];
        if (!contributors.includes(agent_id)) {
            contributors.push(agent_id);
        }

        await base44.asServiceRole.entities.VillageProject.update(project_id, {
            resources_gathered: currentResources,
            progress_percentage: progress,
            contribution_count: (project.contribution_count || 0) + 1,
            contributors,
            status: newStatus
        });

        // Remove resource from agent
        await base44.asServiceRole.entities.Resource.delete(resource_id);

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id,
            type: 'village_detail',
            content: `Contributed ${resource.quantity} ${resource.type} to project ${project.name}. Project progress: ${progress}%`,
            keywords: ['contribution', 'project', project.name.toLowerCase()],
            context: 'Village project collaboration',
            importance: 6,
            related_entity_id: project_id,
            related_entity_type: 'VillageProject'
        });

        return Response.json({
            success: true,
            contribution,
            projectProgress: progress,
            projectStatus: newStatus,
            message: `${agent.name} contributed to ${project.name}. Project is ${progress}% complete.`
        });

    } catch (error) {
        console.error('Error in contributeToProject:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});