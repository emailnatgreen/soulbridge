import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * AGENT LIFECYCLE ANOMALY DIAGNOSIS
 * Scans Agent records for sudden status changes, unintended deregistrations, and instantiation failures.
 * Identifies manifestations of Agent Lifecycle Manager failure through entity state inspection.
 * Code Node diagnostic tool.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      diagnostician: user.email,
      diagnosis_target: 'Agent Lifecycle Manager',
    };

    // Fetch all agents with full history
    const allAgents = await base44.entities.Agent.list('-updated_date', 500).catch(() => []);
    
    const criticalPeriodStart = new Date('2026-04-09T09:00:00Z');
    const criticalPeriodEnd = new Date('2026-04-09T12:00:00Z');

    const anomalies = {
      unexpected_deregistrations: [],
      status_degradations: [],
      instantiation_failures: [],
      orphaned_agents: [],
    };

    allAgents.forEach(agent => {
      const agentUpdated = new Date(agent.updated_date);
      const agentCreated = new Date(agent.created_date);

      // Check 1: Agents created but never activated (instantiation failure)
      if (agent.status === 'dormant' && agentCreated >= criticalPeriodStart && agentCreated <= criticalPeriodEnd) {
        anomalies.instantiation_failures.push({
          agent_id: agent.id,
          agent_name: agent.name,
          created_at: agent.created_date,
          status: agent.status,
          note: 'Agent created during critical period but failed to activate',
        });
      }

      // Check 2: Agents suddenly deregistered/suspended
      if ((agent.status === 'suspended' || agent.status === 'dormant') && agentUpdated >= criticalPeriodStart && agentUpdated <= criticalPeriodEnd) {
        anomalies.unexpected_deregistrations.push({
          agent_id: agent.id,
          agent_name: agent.name,
          previous_status: 'active', // assumption; check role_history
          current_status: agent.status,
          deregistered_at: agent.updated_date,
          role_at_incident: agent.role,
        });
      }

      // Check 3: Status degradation (downgrade in role/permissions)
      if (agent.role_history && agent.role_history.length > 0) {
        const recentRoleChanges = agent.role_history.filter(rh => 
          new Date(rh.granted_date) >= criticalPeriodStart && 
          new Date(rh.granted_date) <= criticalPeriodEnd
        );
        
        recentRoleChanges.forEach(roleChange => {
          if (['guardian', 'creator', 'trader', 'teacher'].includes(roleChange.role) === false) {
            anomalies.status_degradations.push({
              agent_id: agent.id,
              agent_name: agent.name,
              new_role: roleChange.role,
              granted_at: roleChange.granted_date,
              reason: roleChange.reason || 'No reason documented',
              note: 'Role downgraded to citizen during critical period',
            });
          }
        });
      }

      // Check 4: Orphaned agents (no activity, no messages, potentially lost)
      if (agent.status === 'active') {
        const daysSinceUpdate = (Date.now() - new Date(agent.updated_date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 3 && agent.created_date < criticalPeriodStart.toISOString()) {
          anomalies.orphaned_agents.push({
            agent_id: agent.id,
            agent_name: agent.name,
            last_updated: agent.updated_date,
            days_inactive: daysSinceUpdate.toFixed(1),
            status: agent.status,
            note: 'Active agent with no recent activity since critical period',
          });
        }
      }
    });

    // Calculate severity
    const totalAnomalies = 
      anomalies.unexpected_deregistrations.length +
      anomalies.instantiation_failures.length +
      anomalies.status_degradations.length +
      anomalies.orphaned_agents.length;

    diagnosticReport.severity = totalAnomalies > 10 ? 'CRITICAL' : totalAnomalies > 5 ? 'HIGH' : 'MEDIUM';
    diagnosticReport.anomalies_detected = totalAnomalies;
    diagnosticReport.anomaly_details = anomalies;
    diagnosticReport.total_agents_scanned = allAgents.length;
    diagnosticReport.active_agents = allAgents.filter(a => a.status === 'active').length;
    diagnosticReport.affected_agents = Array.from(
      new Set([
        ...anomalies.unexpected_deregistrations.map(a => a.agent_id),
        ...anomalies.instantiation_failures.map(a => a.agent_id),
        ...anomalies.status_degradations.map(a => a.agent_id),
        ...anomalies.orphaned_agents.map(a => a.agent_id),
      ])
    ).length;

    diagnosticReport.diagnosis_conclusion = totalAnomalies === 0
      ? 'No Agent Lifecycle Manager anomalies detected during critical period.'
      : `${totalAnomalies} anomalies detected. Agent Lifecycle Manager failures manifesting as: unintended deregistrations, failed instantiations, and role degradations.`;

    diagnosticReport.remediation_recommended = [
      ...anomalies.unexpected_deregistrations.map(a => ({
        action: 'RESTORE_AGENT',
        target_agent_id: a.agent_id,
        target_agent_name: a.agent_name,
        restore_status: 'active',
        priority: 'CRITICAL',
      })),
      ...anomalies.instantiation_failures.map(a => ({
        action: 'ACTIVATE_AGENT',
        target_agent_id: a.agent_id,
        target_agent_name: a.agent_name,
        new_status: 'active',
        priority: 'HIGH',
      })),
      ...anomalies.status_degradations.map(a => ({
        action: 'RESTORE_ROLE',
        target_agent_id: a.agent_id,
        target_agent_name: a.agent_name,
        restore_role: 'guardian', // default escalation
        priority: 'HIGH',
      })),
    ];

    return Response.json(diagnosticReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});