import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = Deno.env.get('xumm_api_key');
  const apiSecret = Deno.env.get('xume_secret_key');

  // Check if credentials exist and their basic shape
  const diagnosis = {
    api_key_exists: !!apiKey,
    api_key_length: apiKey?.length || 0,
    api_key_preview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING',
    api_secret_exists: !!apiSecret,
    api_secret_length: apiSecret?.length || 0,
    api_secret_preview: apiSecret ? `${apiSecret.substring(0, 8)}...${apiSecret.substring(apiSecret.length - 4)}` : 'MISSING',
    expected_key_format: 'UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)',
    api_key_looks_like_uuid: apiKey ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiKey) : false,
    api_secret_looks_like_uuid: apiSecret ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiSecret) : false,
  };

  // Now try the actual API call with detailed error capture
  const res = await fetch('https://xaman.app/api/v1/platform/payload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
      'X-API-Secret': apiSecret || '',
    },
    body: JSON.stringify({
      txjson: { TransactionType: 'SignIn' },
      options: { submit: false, expire: 5 },
    }),
  });

  const responseText = await res.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (_) {
    responseData = responseText;
  }

  return Response.json({
    diagnosis,
    xaman_response_status: res.status,
    xaman_response: responseData,
  });
});