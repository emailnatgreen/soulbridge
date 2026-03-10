import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, model = 'gpt-4o-mini', temperature = 0.7, max_tokens = 1000 } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI Error:', data);
      return Response.json({ error: data.error?.message || 'OpenAI API error' }, { status: response.status });
    }

    const result = data.choices[0].message.content;

    return Response.json({
      success: true,
      result,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('invokeOpenAI error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});