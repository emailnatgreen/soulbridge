import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all agents named Maya
    const agents = await base44.asServiceRole.entities.Agent.filter({ name: 'Maya' }, 'name', 5);
    const maya = agents[0];
    if (!maya) return Response.json({ skipped: true, reason: 'Maya agent not found' });

    // Check if there are enough new evaluated reviews since last report
    const lastReports = await base44.asServiceRole.entities.MentorReport.filter(
      { agent_id: maya.id }, '-created_date', 1
    );
    const lastReportDate = lastReports[0]?.created_date ? new Date(lastReports[0].created_date) : null;

    const reviews = await base44.asServiceRole.entities.GhostReview.filter({ assigned_agent_id: maya.id });
    const newEvaluated = reviews.filter(r => {
      if (r.status !== 'Evaluated') return false;
      if (!lastReportDate) return true;
      return new Date(r.updated_date) > lastReportDate;
    });

    if (newEvaluated.length < 3) {
      return Response.json({ skipped: true, reason: `Only ${newEvaluated.length} new evaluated reviews since last report (threshold: 3)` });
    }

    // Trigger report generation via function invoke
    const result = await base44.asServiceRole.functions.invoke('generateMentorReport', {
      agent_id: maya.id,
      trigger: 'scheduled'
    });

    return Response.json({ success: true, message: 'Scheduled mentor report generated', result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});