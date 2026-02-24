import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send a message between DIDs
 * Creates a verified, auditable communication record
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to_did, subject, content, message_type = 'direct', reply_to_message_id = null } = await req.json();

    if (!to_did || !content) {
      return Response.json(
        { error: 'Missing required fields: to_did, content' },
        { status: 400 }
      );
    }

    // Get sender's wallet
    const senderWallets = await base44.entities.Wallet.filter({ owner_id: user.id });
    if (senderWallets.length === 0) {
      return Response.json(
        { error: 'No wallet found for sender. Create a DID first.' },
        { status: 404 }
      );
    }

    const senderWallet = senderWallets[0];
    const from_did = `did:xrpl:${senderWallet.classic_address}`;

    // Check if sender's DID is revoked
    if (senderWallet.notes?.includes('REVOKED')) {
      return Response.json(
        { error: 'Cannot send message from revoked DID' },
        { status: 403 }
      );
    }

    // Extract recipient's address from DID
    const toDIDParts = to_did.split(':');
    if (toDIDParts.length !== 3 || toDIDParts[0] !== 'did' || toDIDParts[1] !== 'xrpl') {
      return Response.json(
        { error: 'Invalid recipient DID format' },
        { status: 400 }
      );
    }

    const toClassicAddress = toDIDParts[2];

    // Get recipient's wallet
    const recipientWallets = await base44.entities.Wallet.filter({ classic_address: toClassicAddress });
    if (recipientWallets.length === 0) {
      return Response.json(
        { error: 'Recipient DID not found' },
        { status: 404 }
      );
    }

    const recipientWallet = recipientWallets[0];

    // Check if recipient's DID is revoked
    if (recipientWallet.notes?.includes('REVOKED')) {
      return Response.json(
        { error: 'Cannot send message to revoked DID' },
        { status: 403 }
      );
    }

    // Generate thread ID if this is a reply
    let thread_id;
    if (reply_to_message_id) {
      const originalMessage = await base44.entities.DidMessage.get(reply_to_message_id);
      thread_id = originalMessage?.thread_id || reply_to_message_id;
    } else {
      thread_id = crypto.randomUUID();
    }

    // Create message
    const message = await base44.asServiceRole.entities.DidMessage.create({
      from_did,
      to_did,
      from_wallet_id: senderWallet.id,
      to_wallet_id: recipientWallet.id,
      subject: subject || 'No Subject',
      content,
      message_type,
      status: 'sent',
      reply_to_message_id,
      thread_id,
      is_verified: true,
      metadata: {
        sender_user_id: user.id,
        sender_email: user.email,
        sent_at: new Date().toISOString()
      }
    });

    // Log the message sending
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'did_verified',
        did_classic_address: senderWallet.classic_address,
        wallet_id: senderWallet.id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { 
          action: 'message_sent',
          to_did,
          message_type,
          message_id: message.id
        },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log message:', logError);
    }

    return Response.json({
      success: true,
      message: 'Message sent successfully',
      message_id: message.id,
      thread_id
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
});