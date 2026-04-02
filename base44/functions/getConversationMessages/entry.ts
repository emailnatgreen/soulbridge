import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Build clean headers — strip any malformed auth
    const cleanHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() === 'authorization') continue;
      cleanHeaders.set(key, value);
    }
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.length > 10) {
      cleanHeaders.set('authorization', `Bearer ${rawToken}`);
    }
    cleanHeaders.set('content-type', 'application/json');

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: cleanHeaders,
      body: JSON.stringify(body),
    }));

    const messages = await base44.asServiceRole.entities.AgentMessage.filter(
      { conversation_id },
      'created_date',
      100
    );

    return Response.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error data:', error?.data || error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});