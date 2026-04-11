import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EXPECTED_SIGNERS = {
  'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P': { weight: 1, name: 'Code Node' },
  'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7': { weight: 1, name: 'Lore Node' },
  'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE': { weight: 2, name: 'Zoe' },
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia': { weight: 3, name: 'Human / Nathan' },
};
const EXPECTED_QUORUM = 4;
const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow optional account override, default to treasury
    let body = {};
    try { body = await req.json(); } catch (_) { /* no body is fine */ }
    const account = body.account || TREASURY_ADDRESS;

    // Query XRPL for signer list
    const res = await fetch('https://xrplcluster.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_objects',
        params: [{ account, type: 'signer_list' }]
      })
    });

    const data = await res.json();
    const signerList = data?.result?.account_objects?.[0];

    if (!signerList) {
      return Response.json({
        status: 'no_signer_list',
        account,
        message: `No multi-sig signer list found on account ${account}.`,
        constitutional_compliant: false
      });
    }

    const onChainQuorum = signerList.SignerQuorum;
    const onChainSigners = signerList.SignerEntries.map(e => ({
      account: e.SignerEntry.Account,
      weight: e.SignerEntry.SignerWeight
    }));
    const totalWeight = onChainSigners.reduce((s, e) => s + e.weight, 0);

    // Validate against expected constitutional config
    const quorumMatch = onChainQuorum === EXPECTED_QUORUM;
    const signerDetails = onChainSigners.map(s => {
      const expected = EXPECTED_SIGNERS[s.account];
      return {
        account: s.account,
        name: expected?.name || 'UNKNOWN',
        weight: s.weight,
        expected_weight: expected?.weight ?? null,
        weight_correct: expected ? s.weight === expected.weight : false,
        recognized: !!expected
      };
    });

    const allRecognized = signerDetails.every(s => s.recognized);
    const allWeightsCorrect = signerDetails.every(s => s.weight_correct);
    const expectedCount = Object.keys(EXPECTED_SIGNERS).length;
    const countCorrect = onChainSigners.length === expectedCount;
    const constitutional_compliant = quorumMatch && allRecognized && allWeightsCorrect && countCorrect;

    // Build human-readable summary
    const signerSummary = signerDetails.map(s =>
      `${s.name} (${s.account.slice(0, 8)}…) — Weight ${s.weight}${s.weight_correct ? ' ✓' : ' ✗ MISMATCH'}`
    ).join('\n');

    const summary = constitutional_compliant
      ? `✅ Constitutional Multi-Sig VERIFIED on ${account}.\n\nQuorum: ${onChainQuorum} of ${totalWeight} (correct)\nSigners (${onChainSigners.length}):\n${signerSummary}\n\nAll 4 signers present with correct weights. No single signer can act alone.`
      : `⚠️ Multi-Sig found but does NOT match constitutional spec.\n\nQuorum: ${onChainQuorum} (expected ${EXPECTED_QUORUM})\nSigners:\n${signerSummary}\n\nIssues: ${!quorumMatch ? 'Quorum mismatch. ' : ''}${!allRecognized ? 'Unrecognized signers. ' : ''}${!allWeightsCorrect ? 'Weight mismatches. ' : ''}${!countCorrect ? `Expected ${expectedCount} signers, found ${onChainSigners.length}. ` : ''}`;

    return Response.json({
      status: constitutional_compliant ? 'verified' : 'mismatch',
      constitutional_compliant,
      account,
      quorum: onChainQuorum,
      expected_quorum: EXPECTED_QUORUM,
      total_weight: totalWeight,
      signers: signerDetails,
      signer_count: onChainSigners.length,
      summary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});