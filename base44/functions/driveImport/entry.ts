import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_id } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Get file metadata
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=id,name,mimeType,size,webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) return Response.json({ error: 'Could not fetch Drive file metadata' }, { status: 400 });
    const meta = await metaRes.json();

    // Download file content
    const dlRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!dlRes.ok) return Response.json({ error: 'Could not download Drive file' }, { status: 400 });
    const blob = await dlRes.blob();

    // Upload to platform storage
    const formData = new FormData();
    formData.append('file', blob, meta.name);
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    return Response.json({
      file_url,
      name: meta.name,
      mime_type: meta.mimeType,
      size_bytes: parseInt(meta.size || '0'),
      google_drive_id: meta.id,
      google_drive_url: meta.webViewLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});