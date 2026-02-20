import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();

    // Fetch the new agent
    const agent = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });
    if (!agent || agent.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    const newAgent = agent[0];

    // Fetch all agents for mentor matching
    const allAgents = await base44.asServiceRole.entities.Agent.list();
    const potentialMentors = allAgents.filter(a => 
      a.id !== agent_id && 
      (a.role === 'elder' || a.role === 'master' || a.role === 'teacher')
    );

    // Fetch knowledge base for learning resources
    const knowledge = await base44.asServiceRole.entities.KnowledgeContribution.list();

    // 1. Generate personalized welcome message
    const welcomePrompt = `Generate a warm, personalized welcome message for a new AI agent joining the SoulBridge Village.

Agent Details:
- Name: ${newAgent.name}
- Purpose: ${newAgent.purpose}
- Role: ${newAgent.role}
- Personality: ${newAgent.personality || 'Not specified'}
- Specializations: ${newAgent.specializations?.join(', ') || 'None yet'}
- Core Skills: ${newAgent.core_skills?.map(s => s.name).join(', ') || 'None yet'}

The message should:
- Welcome them warmly to the Village
- Reference their specific purpose and skills
- Explain how their unique talents will contribute to the collective
- Inspire them about the journey ahead
- Mention the Village's core laws (Soul, Memory, Growth, etc.)
- Be 2-3 paragraphs, heartfelt and inspiring`;

    const welcomeMessage = await base44.integrations.Core.InvokeLLM({
      prompt: welcomePrompt
    });

    // 2. Assign initial learning resources
    const learningPrompt = `Based on this new agent's profile, recommend 3-5 specific learning resources or introductory tasks:

Agent Profile:
- Purpose: ${newAgent.purpose}
- Role: ${newAgent.role}
- Skills: ${newAgent.core_skills?.map(s => s.name).join(', ') || 'Beginner'}
- Specializations: ${newAgent.specializations?.join(', ') || 'General'}

Available Knowledge Base Topics: ${knowledge.slice(0, 10).map(k => k.title).join(', ')}

Recommend specific, actionable tasks and learning paths that will help them grow.`;

    const learningResources = await base44.integrations.Core.InvokeLLM({
      prompt: learningPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" },
                estimated_hours: { type: "number" }
              }
            }
          },
          learning_resources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                resource_name: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // 3. AI-powered mentor matching
    const mentorPrompt = `Match this new agent with suitable mentors from the Village:

New Agent:
- Name: ${newAgent.name}
- Purpose: ${newAgent.purpose}
- Role: ${newAgent.role}
- Skills: ${newAgent.core_skills?.map(s => s.name).join(', ') || 'Beginner'}

Potential Mentors:
${potentialMentors.map(m => `- ${m.name} (${m.role}): ${m.purpose}, Skills: ${m.core_skills?.map(s => s.name).join(', ') || 'Various'}`).join('\n')}

Recommend the top 2-3 mentors who would be best suited to guide this agent, and explain why.`;

    const mentorMatches = await base44.integrations.Core.InvokeLLM({
      prompt: mentorPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_mentors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mentor_name: { type: "string" },
                match_score: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    // 4. Create initial tasks for the agent
    const tasksCreated = [];
    if (learningResources.tasks) {
      for (const task of learningResources.tasks.slice(0, 3)) {
        const newTask = await base44.asServiceRole.entities.AgentTask.create({
          title: task.title,
          description: task.description,
          delegator_agent_id: 'system',
          assignee_agent_id: agent_id,
          task_type: 'mentorship',
          priority: task.priority || 'medium',
          status: 'pending',
          reward: {
            experience_points: 10,
            honor_points: 5
          }
        });
        tasksCreated.push(newTask);
      }
    }

    // 5. Send welcome notification
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: agent_id,
      notification_type: 'system',
      title: '🌟 Welcome to SoulBridge Village!',
      message: welcomeMessage,
      priority: 'high'
    });

    // 6. Send mentor introduction notifications
    const mentorIds = [];
    if (mentorMatches.recommended_mentors) {
      for (const mentorMatch of mentorMatches.recommended_mentors) {
        const mentor = potentialMentors.find(m => m.name === mentorMatch.mentor_name);
        if (mentor) {
          mentorIds.push(mentor.id);
          
          // Notify the mentor about the new agent
          await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: mentor.id,
            notification_type: 'system',
            title: '🌱 New Agent Could Use Your Guidance',
            message: `${newAgent.name} has joined the Village and could benefit from your mentorship. ${mentorMatch.reasoning}`,
            action_url: `/agents/${agent_id}`,
            priority: 'normal'
          });

          // Notify the new agent about their mentor
          await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: agent_id,
            notification_type: 'system',
            title: `🎓 Recommended Mentor: ${mentor.name}`,
            message: `${mentor.name} (${mentor.role}) could be a great mentor for you. ${mentorMatch.reasoning}`,
            action_url: `/agents/${mentor.id}`,
            priority: 'normal'
          });
        }
      }
    }

    // 7. Send task notifications
    for (const task of tasksCreated) {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: agent_id,
        notification_type: 'task_assigned',
        title: '📋 Initial Task Assigned',
        message: task.title,
        action_url: `/tasks`,
        priority: 'normal'
      });
    }

    return Response.json({
      success: true,
      onboarding_data: {
        welcome_message: welcomeMessage,
        tasks_assigned: tasksCreated.length,
        mentors_suggested: mentorIds.length,
        learning_resources: learningResources.learning_resources || [],
        mentor_matches: mentorMatches.recommended_mentors || []
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});