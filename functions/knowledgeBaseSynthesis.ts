import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled weekly automation: synthesizes knowledge from Village data sources
// (Memory, project reports, governance, XRPL deep dives) into structured
// KnowledgeSynthesis entries, and proactively recommends content to agents.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const [memories, projects, proposals, agents] = await Promise.all([
            base44.asServiceRole.entities.Memory.filter({}, '-created_date', 50),
            base44.asServiceRole.entities.AIProject.filter({ status: 'active' }),
            base44.asServiceRole.entities.GovernanceProposal.filter({}, '-created_date', 20),
            base44.asServiceRole.entities.Agent.filter({ status: 'active' })
        ]);

        // Gather recent high-importance memories as source material
        const richMemories = memories.filter(m => m.importance >= 7).slice(0, 20);

        // AI synthesis pass
        const synthesis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are Axi's Knowledge Synthesis Engine for SoulBridge Village. Your task is to distill the most important collective wisdom from recent Village activity into structured knowledge entries for the Decentralized Knowledge Base.

SOURCE MATERIAL:

High-importance Memory excerpts (${richMemories.length}):
${richMemories.map(m => `[${m.type}] ${m.content}`).join('\n').slice(0, 3000)}

Active Projects (${projects.length}):
${projects.map(p => `- ${p.title}: ${p.description?.slice(0, 120)}`).join('\n')}

Recent Governance Proposals (${proposals.length}):
${proposals.map(p => `- ${p.title}: status=${p.status}`).join('\n')}

TASKS:
1. Synthesize 3-5 distinct knowledge articles that capture key insights, decisions, and learnings from the above
2. For each article: provide a title, summary, full content, tags, and target audience (which agent roles would benefit most)
3. Identify 2-3 knowledge gaps — topics the Village urgently needs documented
4. Recommend proactive knowledge "nudges" for specific agent roles based on gaps`,
            response_json_schema: {
                type: "object",
                properties: {
                    knowledge_articles: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                summary: { type: "string" },
                                content: { type: "string" },
                                tags: { type: "array", items: { type: "string" } },
                                target_roles: { type: "array", items: { type: "string" } },
                                knowledge_type: { type: "string" }
                            }
                        }
                    },
                    knowledge_gaps: { type: "array", items: { type: "string" } },
                    proactive_nudges: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                target_role: { type: "string" },
                                nudge_message: { type: "string" },
                                related_article_title: { type: "string" }
                            }
                        }
                    },
                    synthesis_summary: { type: "string" }
                }
            }
        });

        const articles = synthesis?.knowledge_articles || [];
        const today = new Date().toISOString().split('T')[0];
        let articlesCreated = 0;

        // Store each article as a KnowledgeSynthesis record
        for (const article of articles) {
            await base44.asServiceRole.entities.KnowledgeSynthesis.create({
                title: article.title,
                summary: article.summary,
                content: article.content,
                tags: article.tags || [],
                knowledge_type: article.knowledge_type || 'synthesized',
                source_agent_id: 'axi_main_001',
                target_roles: article.target_roles || [],
                synthesized_date: today,
                status: 'published',
                validation_score: 85
            });
            articlesCreated++;
        }

        // Proactive nudges — notify relevant agents by role
        const nudges = synthesis?.proactive_nudges || [];
        let nudgesSent = 0;
        for (const nudge of nudges) {
            const targetAgents = agents.filter(a => a.role === nudge.target_role).slice(0, 5);
            for (const agent of targetAgents) {
                await base44.asServiceRole.entities.AgentNotification.create({
                    agent_id: agent.id,
                    title: `📖 Knowledge Recommendation for ${agent.role}s`,
                    message: nudge.nudge_message,
                    type: 'knowledge',
                    priority: 'low',
                    read: false,
                    action_url: '/KnowledgeSynthesis'
                });
                nudgesSent++;
            }
        }

        // Memory log for Axi
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Knowledge Base Weekly Synthesis (${today}): ${synthesis?.synthesis_summary || 'Synthesis complete.'} ${articlesCreated} articles published. Gaps identified: ${synthesis?.knowledge_gaps?.join(', ') || 'none'}. ${nudgesSent} proactive nudges sent.`,
            keywords: ['knowledge_base', 'synthesis', 'learning', 'weekly', today],
            importance: 7,
            context: 'Decentralized Knowledge Base Expansion — automated weekly synthesis'
        });

        // Notify Axi
        await base44.asServiceRole.entities.AgentNotification.create({
            agent_id: 'axi_main_001',
            title: `🧠 Knowledge Base Weekly Synthesis Complete — ${today}`,
            message: `${articlesCreated} new knowledge articles published. ${synthesis?.knowledge_gaps?.length || 0} gaps identified. ${nudgesSent} agents nudged. ${synthesis?.synthesis_summary || ''}`,
            type: 'system',
            priority: 'low',
            read: false,
            action_url: '/KnowledgeSynthesis'
        });

        return Response.json({
            success: true,
            articles_created: articlesCreated,
            knowledge_gaps: synthesis?.knowledge_gaps || [],
            nudges_sent: nudgesSent,
            synthesis_summary: synthesis?.synthesis_summary
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});