import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Get the last 3 violations for this agent
    const violations = await base44.entities.ComplianceHeartbeat.filter(
      { agent_id },
      '-created_date',
      3
    );

    // Check if circuit breaker should trip (3 consecutive violations)
    if (violations.length >= 3) {
      console.log(`🛡️ Law 8 Triggered: Circuit Breaker Tripped for Agent ${agent_id}`);
      
      // Mark as tripped
      await base44.asServiceRole.entities.ComplianceHeartbeat.create({
        agent_id,
        law_violated: 8,
        violation_severity: 10,
        consecutive_count: violations.length,
        is_tripped: true,
        violation_description: 'Circuit breaker tripped - 3 consecutive violations detected',
        action_taken: 'Emergency shutdown initiated'
      });

      // Execute emergency shutdown
      await base44.functions.invoke('executeEmergencyShutdown', { agent_id });

      return Response.json({ 
        tripped: true, 
        message: 'Circuit breaker tripped - emergency shutdown executed',
        violations: violations.length
      });
    }

    return Response.json({ 
      tripped: false, 
      message: 'System safe',
      violations: violations.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});