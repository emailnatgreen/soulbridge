import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Build a clean request — strip any broken auth header for public visitors
    const cleanHeaders = new Headers();
    cleanHeaders.set('content-type', 'application/json');
    for (const [key, value] of req.headers.entries()) {
      const k = key.toLowerCase();
      if (k === 'authorization') continue;
      if (k.startsWith('base44') || k.startsWith('x-base44') || k.startsWith('x-app')) {
        cleanHeaders.set(key, value);
      }
    }
    // Only forward auth header if it looks like a real JWT
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (rawToken && rawToken.includes('.') && rawToken.split('.').length === 3 && rawToken.length > 40) {
      cleanHeaders.set('authorization', `Bearer ${rawToken}`);
    }

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
    console.error('Error:', error?.data || error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});