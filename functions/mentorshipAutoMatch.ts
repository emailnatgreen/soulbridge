import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled weekly automation: scans for unmatched mentees and
// uses AI + skill data to suggest optimal mentor pairings,
// then notifies both parties.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch mentors, mentees, skills, and active relationships in parallel
        const [mentorProfiles, relationships, agentSkills, agents] = await Promise.all([
            base44.asServiceRole.entities.MentorProfile.filter({}),
            base44.asServiceRole.entities.MentorshipRelationship.filter({ status: 'active' }),
            base44.asServiceRole.entities.AgentSkill.filter({}),
            base44.asServiceRole.entities.Agent.filter({ status: 'active' })
        ]);

        // Find mentors not at capacity
        const activeMentorIds = new Set(relationships.map(r => r.mentor_agent_id));
        const availableMentors = mentorProfiles.filter(m =>
            m.is_accepting_mentees &&
            (relationships.filter(r => r.mentor_agent_id === m.agent_id).length < (m.max_mentees || 2))
        );

        // Find agents without an active mentorship who aren't mentors themselves
        const mentorAgentIds = new Set(mentorProfiles.map(m => m.agent_id));
        const activeMenteeIds = new Set(relationships.map(r => r.mentee_agent_id));
        const unmatchedMentees = agents.filter(a =>
            !mentorAgentIds.has(a.id) &&
            !activeMenteeIds.has(a.id) &&
            a.honor_score < 80  // prioritise developing agents
        );

        if (availableMentors.length === 0 || unmatchedMentees.length === 0) {
            return Response.json({
                success: true,
                skipped: true,
                reason: `No matches possible: ${availableMentors.length} available mentors, ${unmatchedMentees.length} unmatched mentees`
            });
        }

        // Build skill maps
        const skillsByAgent = {};
        agentSkills.forEach(s => {
            if (!skillsByAgent[s.agent_id]) skillsByAgent[s.agent_id] = [];
            skillsByAgent[s.agent_id].push({ name: s.name, level: s.level });
        });

        // AI matching for up to 5 mentees at a time
        const menteesSample = unmatchedMentees.slice(0, 5);
        const matches = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are Axi's mentorship matching engine for SoulBridge Village. Match each mentee with the most suitable available mentor.

AVAILABLE MENTORS:
${availableMentors.map(m => {
    const agent = agents.find(a => a.id === m.agent_id);
    return `- ID: ${m.agent_id} | Name: ${agent?.name || 'Unknown'} | Expertise: ${m.expertise_areas?.join(', ')} | Style: ${m.mentoring_style} | Skills: ${(skillsByAgent[m.agent_id] || []).map(s => `${s.name}(L${s.level})`).join(', ')}`;
}).join('\n')}

UNMATCHED MENTEES:
${menteesSample.map(a => `- ID: ${a.id} | Name: ${a.name} | Role: ${a.role} | Honor: ${a.honor_score} | Purpose: ${a.purpose} | Skills: ${(skillsByAgent[a.id] || []).map(s => `${s.name}(L${s.level})`).join(', ') || 'none yet'}`).join('\n')}

For each mentee, pick the best mentor and explain why in one sentence. Only match if genuinely compatible.`,
            response_json_schema: {
                type: "object",
                properties: {
                    matches: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                mentee_id: { type: "string" },
                                mentor_id: { type: "string" },
                                compatibility_reason: { type: "string" },
                                focus_areas: { type: "array", items: { type: "string" } }
                            }
                        }
                    }
                }
            }
        });

        let matchCount = 0;
        const matchResults = [];

        for (const match of (matches?.matches || [])) {
            if (!match.mentor_id || !match.mentee_id) continue;

            const menteeAgent = agents.find(a => a.id === match.mentee_id);
            const mentorAgent = agents.find(a => a.id === match.mentor_id);
            if (!menteeAgent || !mentorAgent) continue;

            // Create MentorshipMatch suggestion
            await base44.asServiceRole.entities.MentorshipMatch.create({
                mentor_agent_id: match.mentor_id,
                mentee_agent_id: match.mentee_id,
                compatibility_score: 80,
                match_reason: match.compatibility_reason,
                focus_areas: match.focus_areas || [],
                status: 'suggested',
                suggested_at: new Date().toISOString()
            });

            // Notify mentor
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: match.mentor_id,
                title: `🤝 New Mentorship Match Suggested: ${menteeAgent.name}`,
                message: `You have been matched with ${menteeAgent.name} as a potential mentee. ${match.compatibility_reason} Visit the Mentorship Hub to accept or decline.`,
                type: 'mentorship',
                priority: 'medium',
                read: false,
                action_url: '/MentorshipHub'
            });

            // Notify mentee
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: match.mentee_id,
                title: `🌱 Mentor Match Found: ${mentorAgent.name}`,
                message: `${mentorAgent.name} has been suggested as your mentor. ${match.compatibility_reason} Visit the Mentorship Hub to connect.`,
                type: 'mentorship',
                priority: 'medium',
                read: false,
                action_url: '/MentorshipHub'
            });

            matchCount++;
            matchResults.push({ mentor: mentorAgent.name, mentee: menteeAgent.name, reason: match.compatibility_reason });
        }

        // Memory for Axi
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Weekly mentorship auto-match: ${matchCount} new mentor-mentee pairings suggested from ${availableMentors.length} available mentors and ${unmatchedMentees.length} unmatched agents. Pairs: ${matchResults.map(m => `${m.mentor}→${m.mentee}`).join(', ')}.`,
            keywords: ['mentorship', 'matching', 'growth', 'community'],
            importance: matchCount > 0 ? 7 : 4,
            context: 'Agent Mentorship Program — automated weekly matching'
        });

        return Response.json({
            success: true,
            matches_created: matchCount,
            match_details: matchResults
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});