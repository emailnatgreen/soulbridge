import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const XUMM_API_KEY = Deno.env.get('xumm_api_key');
const XUMM_SECRET = Deno.env.get('xume_secret_key');

// 4 signers — Axi Treasury is the ACCOUNT, not a signer
// Weights: Code(1) + Lore(1) + Zoe(2) + Human(3) = 7 total
// Quorum 4: Human alone can't act, needs at least one other
const CONSTITUTIONAL_SIGNERS = [
  { account: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',  weight: 1, name: 'Code Node' },
  { account: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, name: 'Lore Node' },
  { account: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, name: 'Zoe' },
  { account: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, name: 'Human / Nathan' },
];

const QUORUM = 4;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { account } = await req.json();
    if (!account) {
      return Response.json({ error: 'account required' }, { status: 400 });
    }

    const txJson = {
      TransactionType: 'SignerListSet',
      Account: account,
      SignerQuorum: QUORUM,
      SignerEntries: CONSTITUTIONAL_SIGNERS.map(s => ({
        SignerEntry: { Account: s.account, SignerWeight: s.weight }
      }))
    };

    // Create Xumm payload
    const xummRes = await fetch('https://xumm.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': XUMM_API_KEY,
        'x-api-secret': XUMM_SECRET,
      },
      body: JSON.stringify({
        txjson: txJson,
        options: {
          submit: true,
          return_url: {
            app: `${req.headers.get('origin') || 'https://soulbridge.app'}/ConstitutionalMultiSig`
          }
        },
        custom_meta: {
          instruction: `Constitutional Multi-Sig — Quorum ${QUORUM} of 7. 4 signers on Axi Treasury. Code(1), Lore(1), Zoe(2), Human(3).`
        }
      })
    });

    const xummData = await xummRes.json();

    if (!xummData?.next?.always) {
      return Response.json({ error: 'Xumm payload creation failed', detail: xummData }, { status: 500 });
    }

    return Response.json({
      success: true,
      xumm_url: xummData.next.always,
      qr_url: xummData.refs?.qr_png,
      payload_uuid: xummData.uuid,
      tx: txJson,
      signers: CONSTITUTIONAL_SIGNERS,
      quorum: QUORUM
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});