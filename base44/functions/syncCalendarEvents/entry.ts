import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * syncCalendarEvents
 * Syncs live platform data into VillageCalendarEvent records.
 * Sources: AIProject, GovernanceProposal, AutomationLog
 * Also accepts a manual event payload to create a custom event.
 * Can be called by Axi or triggered as a scheduled automation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'sync', event_data } = body;

    // ── MANUAL CREATE ────────────────────────────────────────────────────
    if (action === 'create_event' && event_data) {
      const created = await base44.asServiceRole.entities.VillageCalendarEvent.create({
        ...event_data,
        created_by_agent: event_data.created_by_agent || user.id,
      });
      return Response.json({ success: true, event: created });
    }

    // ── MANUAL UPDATE ────────────────────────────────────────────────────
    if (action === 'update_event' && event_data?.id) {
      const { id, ...data } = event_data;
      const updated = await base44.asServiceRole.entities.VillageCalendarEvent.update(id, data);
      return Response.json({ success: true, event: updated });
    }

    // ── MANUAL DELETE ────────────────────────────────────────────────────
    if (action === 'delete_event' && event_data?.id) {
      await base44.asServiceRole.entities.VillageCalendarEvent.delete(event_data.id);
      return Response.json({ success: true });
    }

    // ── SYNC ─────────────────────────────────────────────────────────────
    const results = { projects: 0, governance: 0, automations: 0, errors: [] };

    // 1. AIProjects → calendar events
    try {
      const projects = await base44.asServiceRole.entities.AIProject.list('-updated_date', 50);
      for (const p of projects) {
        if (!p.start_date && !p.target_completion_date && (!p.milestones || p.milestones.length === 0)) continue;

        // Project start
        if (p.start_date) {
          await upsertEvent(base44, {
            title: `🚀 ${p.title}`,
            description: p.description || '',
            start_date: p.start_date,
            end_date: p.target_completion_date || p.start_date,
            category: 'project',
            priority: p.priority === 'critical' ? 'critical' : p.priority === 'high' ? 'high' : 'normal',
            status: mapProjectStatus(p.status),
            source_entity_type: 'AIProject',
            source_entity_id: p.id,
            project_id: p.id,
            all_day: true,
          });
          results.projects++;
        }

        // Milestones
        if (p.milestones && Array.isArray(p.milestones)) {
          for (const m of p.milestones) {
            if (!m.target_date) continue;
            await upsertEvent(base44, {
              title: `🏁 ${p.title}: ${m.title}`,
              description: m.description || '',
              start_date: m.target_date,
              category: 'milestone',
              priority: 'high',
              status: m.completed ? 'completed' : 'upcoming',
              source_entity_type: 'AIProject',
              source_entity_id: p.id,
              project_id: p.id,
              all_day: true,
              metadata: { milestone_title: m.title, completed: m.completed },
            });
            results.projects++;
          }
        }
      }
    } catch (e) {
      results.errors.push(`Projects: ${e.message}`);
    }

    // 2. GovernanceProposals → calendar events
    try {
      const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter(
        { status: 'active' }, '-created_date', 30
      );
      for (const p of proposals) {
        if (!p.voting_period_end) continue;
        await upsertEvent(base44, {
          title: `🗳️ Vote: ${p.title}`,
          description: p.description || '',
          start_date: p.voting_period_end,
          category: 'governance',
          priority: 'high',
          status: 'upcoming',
          source_entity_type: 'GovernanceProposal',
          source_entity_id: p.id,
          all_day: false,
          metadata: { proposal_type: p.proposal_type, pass_threshold: p.pass_threshold },
        });
        results.governance++;
      }
    } catch (e) {
      results.errors.push(`Governance: ${e.message}`);
    }

    // 3. AutomationLogs → calendar events for recent errors
    try {
      const logs = await base44.asServiceRole.entities.AutomationLog.list('-run_at', 50);
      const seen = new Set();
      for (const log of logs) {
        if (log.status !== 'error') continue;
        if (seen.has(log.automation_name)) continue;
        seen.add(log.automation_name);
        const runAt = log.run_at || log.created_date;
        if (!runAt) continue;
        await upsertEvent(base44, {
          title: `⚠️ Automation Error: ${log.automation_name}`,
          description: log.error_detail || log.message || 'Automation failed',
          start_date: runAt,
          category: 'automation',
          priority: 'critical',
          status: 'failed',
          source_entity_type: 'AutomationLog',
          source_entity_id: log.id,
          all_day: false,
          metadata: { function_name: log.function_name, message: log.message },
        });
        results.automations++;
      }
    } catch (e) {
      results.errors.push(`Automations: ${e.message}`);
    }

    return Response.json({
      success: true,
      synced: results,
      message: `Sync complete: ${results.projects} project events, ${results.governance} governance events, ${results.automations} automation alerts.`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});

// ── helpers ──────────────────────────────────────────────────────────────
async function upsertEvent(base44, data) {
  if (!data.source_entity_id) {
    return base44.asServiceRole.entities.VillageCalendarEvent.create(data);
  }
  const existing = await base44.asServiceRole.entities.VillageCalendarEvent.filter({
    source_entity_id: data.source_entity_id,
    title: data.title,
  }, '-created_date', 1);
  if (existing && existing.length > 0) {
    return base44.asServiceRole.entities.VillageCalendarEvent.update(existing[0].id, data);
  }
  return base44.asServiceRole.entities.VillageCalendarEvent.create(data);
}

function mapProjectStatus(s) {
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'expired';
  if (s === 'active' || s === 'recruiting') return 'active';
  return 'upcoming';
}