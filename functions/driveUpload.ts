import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, file_name, mime_type } = await req.json();

    // Get the file content from the platform URL
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Could not fetch file from platform' }, { status: 400 });
    const fileBuffer = await fileRes.arrayBuffer();

    // Get Google Drive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Upload to Google Drive using multipart upload
    const boundary = '-------314159265358979323846';
    const metadata = JSON.stringify({
      name: file_name,
      mimeType: mime_type || 'image/jpeg',
    });

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      `Content-Type: ${mime_type || 'image/jpeg'}`,
      'Content-Transfer-Encoding: base64',
      '',
      btoa(String.fromCharCode(...new Uint8Array(fileBuffer))),
      `--${boundary}--`,
    ].join('\r\n');

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return Response.json({ error: 'Drive upload failed', details: err }, { status: 400 });
    }

    const driveFile = await uploadRes.json();

    // Make the file publicly readable
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    return Response.json({
      google_drive_id: driveFile.id,
      google_drive_url: driveFile.webViewLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});