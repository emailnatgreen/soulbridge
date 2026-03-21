import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      name, 
      purpose, 
      personality, 
      role, 
      wallet_id,
      bio,
      tagline,
      contact_email,
      contact_phone,
      specializations
    } = await req.json();

    if (!name || !purpose) {
      return Response.json(
        { error: 'Missing required fields: name, purpose' },
        { status: 400 }
      );
    }

    // If wallet_id provided, verify ownership and get classic_address
    let classic_address = null;
    if (wallet_id) {
      const wallet = await base44.entities.Wallet.get(wallet_id);
      if (!wallet) {
        return Response.json({ error: 'Wallet not found' }, { status: 404 });
      }
      if (wallet.owner_id !== user.id) {
        return Response.json({ error: 'You do not own this wallet' }, { status: 403 });
      }
      classic_address = wallet.classic_address;
    }

    // Create agent - only include wallet_id if it's a valid string
    const agentData = {
      name,
      purpose,
      personality: personality || '',
      role: role || 'citizen',
      classic_address: classic_address,
      bio: bio || '',
      tagline: tagline || '',
      metadata: {
        contact_email: contact_email || '',
        contact_phone: contact_phone || '',
        created_by_user_id: user.id
      },
      specializations: specializations || [],
      honor_score: 100,
      status: 'active'
    };
    if (wallet_id) agentData.wallet_id = wallet_id;

    const agent = await base44.entities.Agent.create(agentData);

    // Log agent creation
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'agent_created',
        did_classic_address: classic_address,
        wallet_id: wallet_id || undefined,
        agent_id: agent.id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { name, role, linked_to_did: !!wallet_id },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log agent creation:', logError);
    }

    return Response.json({
      success: true,
      agent: agent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return Response.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
});