import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Helper function to log DID-related activities
 * Can be called from other backend functions or directly from frontend
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      action_type,
      did_classic_address,
      wallet_id,
      agent_id,
      action_details,
      success = true,
      error_message
    } = await req.json();

    if (!action_type) {
      return Response.json(
        { error: 'Missing required field: action_type' },
        { status: 400 }
      );
    }

    // Extract IP address and user agent from request
    const ip_address = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Create audit log entry
    const auditLog = await base44.asServiceRole.entities.DidAuditLog.create({
      action_type,
      did_classic_address: did_classic_address || null,
      wallet_id: wallet_id || null,
      agent_id: agent_id || null,
      user_id: user.id,
      user_email: user.email,
      ip_address,
      user_agent,
      action_details: action_details || {},
      success,
      error_message: error_message || null
    });

    return Response.json({
      success: true,
      log_id: auditLog.id
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't fail the request if logging fails
    return Response.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
});