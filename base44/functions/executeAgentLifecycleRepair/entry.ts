import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * AGENT LIFECYCLE REPAIR EXECUTOR
 * Executes automated remediation actions for detected Agent Lifecycle Manager anomalies.
 * Restores agents to active state, reactivates failed instantiations, and restores roles.
 * Code Node repair tool.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const repairReport = {
      timestamp: new Date().toISOString(),
      executor: user.email,
      repair_target: 'Agent Lifecycle Manager',
      actions_taken: [],
      success_count: 0,
      failure_count: 0,
    };

    // First, run the diagnostic to identify affected agents
    const diagnosticResponse = await base44.functions.invoke('diagnoseAgentLifecycleAnomalies', {});
    const diagnosticData = diagnosticResponse.data;

    if (!diagnosticData.remediation_recommended || diagnosticData.remediation_recommended.length === 0) {
      repairReport.status = 'NO_REPAIRS_NEEDED';
      repairReport.message = 'No agent lifecycle anomalies requiring repair detected.';
      return Response.json(repairReport);
    }

    // Execute remediation actions
    for (const action of diagnosticData.remediation_recommended) {
      try {
        if (action.action === 'RESTORE_AGENT') {
          await base44.entities.Agent.update(action.target_agent_id, { status: 'active' });
          repairReport.actions_taken.push({
            action: 'RESTORE_AGENT',
            agent_id: action.target_agent_id,
            agent_name: action.target_agent_name,
            status: 'success',
            timestamp: new Date().toISOString(),
          });
          repairReport.success_count++;
        } else if (action.action === 'ACTIVATE_AGENT') {
          await base44.entities.Agent.update(action.target_agent_id, { status: 'active' });
          repairReport.actions_taken.push({
            action: 'ACTIVATE_AGENT',
            agent_id: action.target_agent_id,
            agent_name: action.target_agent_name,
            status: 'success',
            timestamp: new Date().toISOString(),
          });
          repairReport.success_count++;
        } else if (action.action === 'RESTORE_ROLE') {
          await base44.entities.Agent.update(action.target_agent_id, { role: action.restore_role });
          repairReport.actions_taken.push({
            action: 'RESTORE_ROLE',
            agent_id: action.target_agent_id,
            agent_name: action.target_agent_name,
            restored_role: action.restore_role,
            status: 'success',
            timestamp: new Date().toISOString(),
          });
          repairReport.success_count++;
        }
      } catch (error) {
        repairReport.actions_taken.push({
          action: action.action,
          agent_id: action.target_agent_id,
          agent_name: action.target_agent_name,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        repairReport.failure_count++;
      }
    }

    repairReport.status = repairReport.failure_count === 0 ? 'REPAIR_COMPLETE' : 'PARTIAL_REPAIR';
    repairReport.summary = `Executed ${repairReport.success_count} successful repairs, ${repairReport.failure_count} failures.`;

    return Response.json(repairReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});