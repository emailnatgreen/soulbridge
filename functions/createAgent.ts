import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Create agent
    const agent = await base44.entities.Agent.create({
      name,
      purpose,
      personality: personality || '',
      role: role || 'citizen',
      wallet_id: wallet_id || null,
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
    });

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