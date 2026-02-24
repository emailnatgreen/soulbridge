import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { permission_id } = await req.json();

    if (!permission_id) {
      return Response.json(
        { error: 'Missing required field: permission_id' },
        { status: 400 }
      );
    }

    // Get the permission
    const permission = await base44.entities.DidPermission.get(permission_id);
    if (!permission) {
      return Response.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Verify the user granted this permission (or is admin)
    if (permission.granted_by_user_id !== user.id && user.role !== 'admin') {
      return Response.json(
        { error: 'You do not have authority to revoke this permission' },
        { status: 403 }
      );
    }

    // Update permission status
    const updatedPermission = await base44.entities.DidPermission.update(permission_id, {
      status: 'revoked',
      revoked_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      permission: updatedPermission
    });
  } catch (error) {
    console.error('Error revoking DID permission:', error);
    return Response.json(
      { error: error.message || 'Failed to revoke permission' },
      { status: 500 }
    );
  }
});