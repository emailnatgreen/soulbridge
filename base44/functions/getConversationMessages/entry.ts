import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Build clean headers — completely exclude authorization, re-add only if valid JWT
    const cleanHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() === 'authorization') continue;
      cleanHeaders.set(key, value);
    }
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    // Only accept tokens that look like real JWTs (contain dots and are long enough)
    if (rawToken && rawToken.includes('.') && rawToken.length > 20) {
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