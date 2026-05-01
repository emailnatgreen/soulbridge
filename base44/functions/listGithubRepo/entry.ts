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
      'Accept': 'application/vnd.github.v3+json'
    };

    const body = await req.json().catch(() => ({}));
    const path = body.path || '';

    // Get repo info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders });
    if (!repoRes.ok) return Response.json({ error: `repo: ${repoRes.status}` }, { status: 500 });
    const repoData = await repoRes.json();

    // Get contents
    const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: ghHeaders });
    if (!contentsRes.ok) return Response.json({ error: `contents: ${contentsRes.status}` }, { status: 500 });
    const contents = await contentsRes.json();

    const listing = Array.isArray(contents) ? contents.map(c => ({
      name: c.name, type: c.type, path: c.path, size: c.size
    })) : [{ name: contents.name, type: contents.type, path: contents.path, size: contents.size }];

    return Response.json({
      repo: {
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        default_branch: repoData.default_branch,
        language: repoData.language,
        size_kb: repoData.size,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        pushed_at: repoData.pushed_at,
        topics: repoData.topics || []
      },
      contents: listing
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});