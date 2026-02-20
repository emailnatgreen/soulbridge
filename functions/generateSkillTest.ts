import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { skill_name, skill_category, claimed_level } = await req.json();

        if (!skill_name || !claimed_level) {
            return Response.json({ error: 'skill_name and claimed_level required' }, { status: 400 });
        }

        const prompt = `Generate a skill validation test for the following:

Skill: ${skill_name}
Category: ${skill_category || 'General'}
Target Level: ${claimed_level}/5

Create ${Math.min(claimed_level * 2 + 3, 10)} questions that assess proficiency at this level.

For each question:
- Make it practical and scenario-based
- Include what a good answer should demonstrate
- Vary difficulty to properly assess the claimed level

Return a comprehensive test.`;

        const testSchema = {
            type: "object",
            properties: {
                questions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            question: { type: "string" },
                            type: { 
                                type: "string",
                                enum: ["multiple_choice", "short_answer", "scenario"]
                            },
                            options: {
                                type: "array",
                                items: { type: "string" }
                            },
                            expected_answer: { type: "string" },
                            difficulty: {
                                type: "string",
                                enum: ["easy", "medium", "hard"]
                            },
                            points: { type: "number" }
                        }
                    }
                }
            }
        };

        const test = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: testSchema
        });

        return Response.json({ success: true, test });

    } catch (error) {
        console.error('Test generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});