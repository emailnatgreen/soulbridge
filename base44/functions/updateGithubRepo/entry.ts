import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const owner = 'emailnatgreen';
    const repo = 'soulbridge';
    const ghHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    const body = await req.json().catch(() => ({}));
    const updates = {};
    if (body.description) updates.description = body.description;
    if (body.homepage) updates.homepage = body.homepage;
    if (body.topics) updates.topics = body.topics;
    if (typeof body.private === 'boolean') updates.private = body.private;

    // Update repo settings
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'PATCH',
      headers: ghHeaders,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `GitHub API ${res.status}: ${errText}` }, { status: 500 });
    }

    const data = await res.json();

    // Update topics if provided (separate endpoint)
    if (body.topics) {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/topics`, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Accept': 'application/vnd.github.mercy-preview+json' },
        body: JSON.stringify({ names: body.topics })
      });
    }

    return Response.json({
      message: 'Repository updated',
      name: data.name,
      description: data.description,
      homepage: data.homepage,
      private: data.private,
      topics: body.topics || data.topics,
      html_url: data.html_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});