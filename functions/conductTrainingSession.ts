import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { training_id, action, data } = await req.json();
        
        if (!training_id || !action) {
            return Response.json({ error: 'training_id and action required' }, { status: 400 });
        }
        
        // Get training
        const training = await base44.entities.AgentTraining.get(training_id);
        if (!training) {
            return Response.json({ error: 'Training not found' }, { status: 404 });
        }
        
        // Get agent
        const agent = await base44.entities.Agent.get(training.agent_id);
        const agentStates = await base44.entities.AgentState.filter({ agent_id: training.agent_id });
        const agentState = agentStates[0];
        
        let updatedProgress = training.progress;
        let statusUpdate = training.status;
        let message = '';
        
        switch (action) {
            case 'start':
                statusUpdate = 'in_progress';
                message = `Training "${training.title}" started`;
                break;
                
            case 'complete_lesson':
                const lessonNumber = data?.lesson_number || 0;
                updatedProgress = {
                    ...training.progress,
                    lessons_completed: training.progress.lessons_completed + 1,
                    completion_percentage: Math.floor(
                        ((training.progress.lessons_completed + 1) / (training.training_content.lessons?.length || 1)) * 50 +
                        (training.progress.exercises_completed / (training.training_content.exercises?.length || 1)) * 50
                    ),
                    time_spent_minutes: training.progress.time_spent_minutes + (data?.time_spent || 15)
                };
                message = `Lesson ${lessonNumber} completed`;
                break;
                
            case 'complete_exercise':
                const exerciseNumber = data?.exercise_number || 0;
                updatedProgress = {
                    ...training.progress,
                    exercises_completed: training.progress.exercises_completed + 1,
                    completion_percentage: Math.floor(
                        (training.progress.lessons_completed / (training.training_content.lessons?.length || 1)) * 50 +
                        ((training.progress.exercises_completed + 1) / (training.training_content.exercises?.length || 1)) * 50
                    ),
                    time_spent_minutes: training.progress.time_spent_minutes + (data?.time_spent || 20)
                };
                message = `Exercise ${exerciseNumber} completed`;
                break;
                
            case 'request_assessment':
                // Check if training is ready for assessment
                if (updatedProgress.completion_percentage < 80) {
                    return Response.json({ 
                        success: false,
                        error: 'Training must be at least 80% complete before assessment' 
                    }, { status: 400 });
                }
                
                // Generate AI assessment
                const assessmentPrompt = `
Agent ${agent.name} has completed training: "${training.title}"
Training Type: ${training.training_type}
Difficulty: ${training.difficulty_level}/5
Lessons Completed: ${updatedProgress.lessons_completed}/${training.training_content.lessons?.length}
Exercises Completed: ${updatedProgress.exercises_completed}/${training.training_content.exercises?.length}

Agent's responses to exercises:
${data?.exercise_responses || 'No specific responses provided'}

Assess the agent's understanding and mastery of the training content.
Score from 0-100, pass threshold is 70.
Provide constructive feedback.
`;

                const assessmentResult = await base44.integrations.Core.InvokeLLM({
                    prompt: assessmentPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            score: { type: "number" },
                            passed: { type: "boolean" },
                            feedback: { type: "string" },
                            strengths: { type: "array", items: { type: "string" } },
                            areas_for_improvement: { type: "array", items: { type: "string" } }
                        }
                    }
                });
                
                const assessment = {
                    score: assessmentResult.score,
                    passed: assessmentResult.passed,
                    feedback: assessmentResult.feedback,
                    attempts: (training.assessment?.attempts || 0) + 1
                };
                
                await base44.entities.AgentTraining.update(training_id, {
                    assessment: assessment,
                    status: assessmentResult.passed ? 'completed' : 'in_progress'
                });
                
                // If passed, award rewards
                if (assessmentResult.passed) {
                    await base44.entities.AgentState.update(agentState.id, {
                        experience: agentState.experience + training.rewards.experience_gained,
                        wisdom: agentState.wisdom + training.rewards.wisdom_gained
                    });
                    
                    await base44.entities.Agent.update(agent.id, {
                        honor_score: Math.min(100, agent.honor_score + training.rewards.honor_gained)
                    });
                    
                    await base44.entities.AgentTraining.update(training_id, {
                        completed_date: new Date().toISOString()
                    });
                    
                    message = `Assessment passed! Score: ${assessmentResult.score}/100. Rewards granted.`;
                } else {
                    message = `Assessment not passed. Score: ${assessmentResult.score}/100. Review and try again.`;
                }
                
                return Response.json({
                    success: true,
                    assessment: {
                        score: assessmentResult.score,
                        passed: assessmentResult.passed,
                        feedback: assessmentResult.feedback,
                        strengths: assessmentResult.strengths,
                        areas_for_improvement: assessmentResult.areas_for_improvement
                    },
                    rewards_granted: assessmentResult.passed ? training.rewards : null
                });
                
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }
        
        // Update training progress
        await base44.entities.AgentTraining.update(training_id, {
            progress: updatedProgress,
            status: statusUpdate
        });
        
        return Response.json({
            success: true,
            message,
            progress: updatedProgress
        });
        
    } catch (error) {
        console.error('Training session error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});