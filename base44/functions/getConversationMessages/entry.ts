import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v3 — forced redeploy — auth header sanitized for mobile browsers
function sanitizeRequest(req, bodyStr) {
  const authHeader = (req.headers.get('authorization') || '').trim();
  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 40;

  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  h.set('authorization', isValidJwt ? `Bearer ${rawToken}` : 'Bearer anon.anon.anon');
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

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