import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Mark a DID message as read
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_id } = await req.json();

    if (!message_id) {
      return Response.json(
        { error: 'Missing required field: message_id' },
        { status: 400 }
      );
    }

    // Get message
    const message = await base44.entities.DidMessage.get(message_id);
    if (!message) {
      return Response.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user owns the recipient wallet
    const recipientWallet = await base44.entities.Wallet.get(message.to_wallet_id);
    if (recipientWallet.owner_id !== user.id) {
      return Response.json(
        { error: 'Unauthorized to mark this message as read' },
        { status: 403 }
      );
    }

    // Update message status
    await base44.asServiceRole.entities.DidMessage.update(message_id, {
      status: 'read',
      read_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Error marking message as read:', error);
    return Response.json(
      { error: 'Failed to mark message as read', message: error.message },
      { status: 500 }
    );
  }
});