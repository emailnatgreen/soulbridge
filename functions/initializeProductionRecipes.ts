import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if recipes already exist
        const existing = await base44.entities.ProductionRecipe.list();
        if (existing.length > 0) {
            return Response.json({ 
                message: 'Recipes already initialized',
                count: existing.length 
            });
        }

        const recipes = [
            // Basic Processing
            {
                recipe_name: "Dataset Processing",
                description: "Transform raw data into structured training dataset",
                category: "processing",
                inputs: [
                    { resource_category: "raw_material", resource_name: "Raw Data", quantity: 100 }
                ],
                outputs: [
                    { resource_category: "dataset", resource_name: "Training Dataset", quantity: 10 }
                ],
                cycle_duration_hours: 2,
                required_skills: ["Data Processing"],
                base_efficiency: 0.85,
                complexity: "simple"
            },
            {
                recipe_name: "API Development",
                description: "Build API access from compute resources and code",
                category: "development",
                inputs: [
                    { resource_category: "compute_power", resource_name: "GPU Hours", quantity: 10 },
                    { resource_category: "raw_material", resource_name: "Source Code", quantity: 1 }
                ],
                outputs: [
                    { resource_category: "api_access", resource_name: "REST API Access", quantity: 1 }
                ],
                cycle_duration_hours: 6,
                required_skills: ["API Development", "Backend Engineering"],
                base_efficiency: 0.9,
                complexity: "moderate"
            },
            {
                recipe_name: "AI Model Training",
                description: "Train AI model from dataset and compute power",
                category: "research",
                inputs: [
                    { resource_category: "dataset", resource_name: "Training Dataset", quantity: 5 },
                    { resource_category: "compute_power", resource_name: "GPU Hours", quantity: 50 }
                ],
                outputs: [
                    { resource_category: "software_license", resource_name: "AI Model License", quantity: 1 }
                ],
                cycle_duration_hours: 12,
                required_skills: ["Machine Learning", "AI Development"],
                base_efficiency: 0.8,
                complexity: "complex",
                unlock_requirements: {
                    honor_score: 200
                }
            },
            {
                recipe_name: "Design Asset Creation",
                description: "Create design assets from templates and tools",
                category: "crafting",
                inputs: [
                    { resource_category: "tool", resource_name: "Design Software", quantity: 1 },
                    { resource_category: "raw_material", resource_name: "Templates", quantity: 5 }
                ],
                outputs: [
                    { resource_category: "design_asset", resource_name: "UI Components", quantity: 10 }
                ],
                cycle_duration_hours: 4,
                required_skills: ["Design", "UI/UX"],
                base_efficiency: 0.9,
                complexity: "simple"
            },
            {
                recipe_name: "Knowledge Synthesis",
                description: "Synthesize knowledge packages from research outputs",
                category: "synthesis",
                inputs: [
                    { resource_category: "research_output", resource_name: "Research Paper", quantity: 3 },
                    { resource_category: "dataset", resource_name: "Training Dataset", quantity: 2 }
                ],
                outputs: [
                    { resource_category: "knowledge_package", resource_name: "Learning Module", quantity: 1 }
                ],
                cycle_duration_hours: 8,
                required_skills: ["Research", "Knowledge Management"],
                base_efficiency: 0.85,
                complexity: "moderate"
            },
            {
                recipe_name: "Tool Refinement",
                description: "Refine raw tools into professional-grade software",
                category: "refinement",
                inputs: [
                    { resource_category: "raw_material", resource_name: "Source Code", quantity: 10 },
                    { resource_category: "compute_power", resource_name: "GPU Hours", quantity: 5 }
                ],
                outputs: [
                    { resource_category: "tool", resource_name: "Development Tool", quantity: 1 }
                ],
                cycle_duration_hours: 5,
                required_skills: ["Software Engineering"],
                base_efficiency: 0.9,
                complexity: "moderate"
            },
            {
                recipe_name: "Advanced Research Output",
                description: "Generate cutting-edge research from datasets and compute",
                category: "research",
                inputs: [
                    { resource_category: "dataset", resource_name: "Training Dataset", quantity: 10 },
                    { resource_category: "compute_power", resource_name: "GPU Hours", quantity: 100 },
                    { resource_category: "knowledge_package", resource_name: "Learning Module", quantity: 2 }
                ],
                outputs: [
                    { resource_category: "research_output", resource_name: "Research Paper", quantity: 1 }
                ],
                cycle_duration_hours: 24,
                required_skills: ["Research", "AI Development", "Machine Learning"],
                base_efficiency: 0.75,
                complexity: "advanced",
                unlock_requirements: {
                    honor_score: 300,
                    completed_projects: 5
                }
            }
        ];

        const created = [];
        for (const recipe of recipes) {
            const newRecipe = await base44.asServiceRole.entities.ProductionRecipe.create(recipe);
            created.push(newRecipe);
        }

        return Response.json({
            success: true,
            message: `Initialized ${created.length} production recipes`,
            recipes: created
        });

    } catch (error) {
        console.error('Initialize recipes error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});