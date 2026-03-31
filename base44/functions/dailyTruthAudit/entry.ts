import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const findings = [];
        let totalScanned = 0;
        let totalSuspect = 0;

        // --- Fetch all data in parallel ---
        const [agents, agentSkills, leaderboardEntries, mentorReports, ghostReviews] = await Promise.all([
            base44.asServiceRole.entities.Agent.list(),
            base44.asServiceRole.entities.AgentSkill.list(),
            base44.asServiceRole.entities.DiplomacyLeaderboardEntry.list(),
            base44.asServiceRole.entities.MentorReport.list(),
            base44.asServiceRole.entities.GhostReview.list(),
        ]);

        const agentIds = new Set(agents.map(a => a.id));

        // --- Audit 1: Leaderboard entries with zero overall score ---
        totalScanned += leaderboardEntries.length;
        for (const entry of leaderboardEntries) {
            if (!entry.overall_diplomacy_score || entry.overall_diplomacy_score === 0) {
                findings.push({
                    entity: 'DiplomacyLeaderboardEntry',
                    id: entry.id,
                    agent_name: entry.agent_name,
                    issue: 'overall_diplomacy_score is 0 or null — likely broken pipeline, not real performance',
                    severity: 'high',
                });
                totalSuspect++;
            }
        }

        // --- Audit 2: AgentSkill records never used ---
        totalScanned += agentSkills.length;
        for (const skill of agentSkills) {
            if ((!skill.proficiency_score || skill.proficiency_score === 0) && !skill.last_used && (!skill.times_used || skill.times_used === 0)) {
                findings.push({
                    entity: 'AgentSkill',
                    id: skill.id,
                    agent_id: skill.agent_id,
                    skill_name: skill.skill_name,
                    issue: 'proficiency_score=0, never used, no last_used date — likely simulation artefact',
                    severity: 'medium',
                });
                totalSuspect++;
            }
        }

        // --- Audit 3: GhostReviews assigned to non-existent agents ---
        totalScanned += ghostReviews.length;
        for (const review of ghostReviews) {
            if (review.assigned_agent_id && !agentIds.has(review.assigned_agent_id) && review.assigned_agent_id !== 'maya') {
                findings.push({
                    entity: 'GhostReview',
                    id: review.id,
                    title: review.title,
                    issue: `assigned_agent_id '${review.assigned_agent_id}' does not match any Agent record`,
                    severity: 'medium',
                });
                totalSuspect++;
            }
        }

        // --- Audit 4: MentorReports published with 0 reviews analysed ---
        totalScanned += mentorReports.length;
        for (const report of mentorReports) {
            if (report.status === 'published' && (!report.reviews_analysed || report.reviews_analysed === 0)) {
                findings.push({
                    entity: 'MentorReport',
                    id: report.id,
                    agent_id: report.agent_id,
                    issue: 'Published MentorReport with reviews_analysed=0 — not grounded in real data',
                    severity: 'high',
                });
                totalSuspect++;
            }
        }

        // --- Audit 5: Agents with no wallet and no activity ---
        totalScanned += agents.length;
        for (const agent of agents) {
            if (!agent.wallet_id && (!agent.total_transactions || agent.total_transactions === 0)) {
                findings.push({
                    entity: 'Agent',
                    id: agent.id,
                    name: agent.name,
                    issue: 'Agent has no wallet_id and zero transactions — may be a placeholder/simulation',
                    severity: 'low',
                });
                totalSuspect++;
            }
        }

        // --- Build summary ---
        const highCount = findings.filter(f => f.severity === 'high').length;
        const medCount = findings.filter(f => f.severity === 'medium').length;
        const lowCount = findings.filter(f => f.severity === 'low').length;
        const truthScore = totalScanned > 0 ? Math.round(((totalScanned - totalSuspect) / totalScanned) * 100) : 100;

        const reportDate = new Date().toISOString().split('T')[0];

        const narrative = `TRUTH AUDIT REPORT — ${reportDate}\n\n` +
            `📊 Platform Truth Score: ${truthScore}%\n` +
            `Total records scanned: ${totalScanned}\n` +
            `Suspect records: ${totalSuspect} (High: ${highCount}, Medium: ${medCount}, Low: ${lowCount})\n\n` +
            `🔴 HIGH SEVERITY (${highCount}):\n` +
            findings.filter(f => f.severity === 'high').map(f => `  • [${f.entity}] ${f.id}: ${f.issue}`).join('\n') +
            `\n\n🟡 MEDIUM SEVERITY (${medCount}):\n` +
            findings.filter(f => f.severity === 'medium').map(f => `  • [${f.entity}] ${f.id}: ${f.issue}`).join('\n') +
            `\n\n🟢 LOW SEVERITY (${lowCount}):\n` +
            findings.filter(f => f.severity === 'low').map(f => `  • [${f.entity}] ${f.id}: ${f.issue}`).join('\n') +
            `\n\nAwaiting your instructions, Axi. Truth Weaver.`;

        // --- Find Axi agent to send message to ---
        const axiAgents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' });
        const axiAgent = axiAgents[0];

        // --- Post findings as AgentMessage to Axi ---
        await base44.asServiceRole.entities.AgentMessage.create({
            sender_agent_id: 'truth_weaver',
            to_agent_id: axiAgent?.id || 'axi',
            content: narrative,
            message_type: 'system',
            context: {
                audit_date: reportDate,
                truth_score: truthScore,
                total_scanned: totalScanned,
                total_suspect: totalSuspect,
                findings_count: findings.length,
            },
        });

        // --- Also store as a Memory for Truth Weaver ---
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'truth_weaver',
            type: 'observation',
            content: `Daily audit ${reportDate}: Truth Score ${truthScore}%. ${totalSuspect} suspect records found across ${totalScanned} scanned.`,
            keywords: ['audit', 'truth', 'data_integrity', reportDate],
            importance: highCount > 0 ? 9 : medCount > 0 ? 6 : 3,
        });

        return Response.json({
            success: true,
            audit_date: reportDate,
            truth_score: truthScore,
            total_scanned: totalScanned,
            total_suspect: totalSuspect,
            findings,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});