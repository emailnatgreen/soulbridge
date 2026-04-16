/**
 * Axi InvokeLLM Wrapper
 * 
 * Gives Axi (and other agents) direct access to the InvokeLLM integration
 * via a backend function tool.
 * 
 * POST { prompt, add_context_from_internet?, response_json_schema?, file_urls? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, add_context_from_internet, response_json_schema, file_urls } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const llmParams = { prompt };

    if (add_context_from_internet) {
      llmParams.add_context_from_internet = true;
    }
    if (response_json_schema) {
      llmParams.response_json_schema = response_json_schema;
    }
    if (file_urls) {
      llmParams.file_urls = file_urls;
    }

    const result = await base44.integrations.Core.InvokeLLM(llmParams);

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('[axiInvokeLLM] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});