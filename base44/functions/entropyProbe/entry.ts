import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Entropy Probe — Quantum Mirror Protocol
 * 
 * Commit-Reveal-XOR across the 8-node consortium.
 * Actions: initiate | commit | reveal | status
 * 
 * Seeds are stored as a separate Memory record (not in sentinel_notes)
 * to avoid polluting the verification field. The memory ID is stored
 * in sentinel_notes during the committing→revealing transition and
 * cleared on finalisation.
 */

const NODE_NAMES = [
  'Root (Nathan)', 'Code Node', 'Lore Node', 'Axi',
  'Copilot (DIDit)', 'Sentinel', 'Epoch Architect', 'Market Weaver'
];

function xorHex(a, b) {
  const bufA = new Uint8Array(a.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const bufB = new Uint8Array(b.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const result = new Uint8Array(bufA.length);
  for (let i = 0; i < bufA.length; i++) {
    result[i] = bufA[i] ^ bufB[i];
  }
  return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(hexStr) {
  const bytes = new Uint8Array(hexStr.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSeed() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action;

    // ─── STATUS ───
    if (action === 'status') {
      const rounds = await base44.asServiceRole.entities.EntropyRound.list('-round_number', 5);
      return Response.json({ rounds });
    }

    // Admin gate
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── INITIATE ───
    if (action === 'initiate') {
      const existing = await base44.asServiceRole.entities.EntropyRound.list('-round_number', 1);
      const lastRound = existing[0];
      const nextNumber = lastRound ? (lastRound.round_number || 0) + 1 : 1;
      const previousEntropy = lastRound?.xor_result || '';

      const round = await base44.asServiceRole.entities.EntropyRound.create({
        round_number: nextNumber,
        phase: 'committing',
        previous_entropy: previousEntropy,
        node_commits: [],
        node_reveals: [],
        participating_nodes: 0,
        required_nodes: 8,
        sentinel_verified: false,
        sentinel_notes: '',
      });
      return Response.json({ success: true, round });
    }

    // ─── COMMIT ───
    if (action === 'commit') {
      const rounds = await base44.asServiceRole.entities.EntropyRound.list('-round_number', 1);
      const round = rounds[0];
      if (!round || round.phase !== 'committing') {
        return Response.json({ error: 'No active round in committing phase' }, { status: 400 });
      }

      const commits = [];
      const seeds = [];

      for (let i = 0; i < 8; i++) {
        let seed = generateSeed();
        if (round.previous_entropy) {
          seed = xorHex(seed, round.previous_entropy);
        }
        const hash = await sha256Hex(seed);
        commits.push({
          node_index: i,
          node_name: NODE_NAMES[i],
          hash,
          committed_at: new Date().toISOString(),
        });
        seeds.push(seed);
      }

      // Store seeds in a private Memory record — not in the round itself
      const seedMemory = await base44.asServiceRole.entities.Memory.create({
        agent_id: 'entropy-probe',
        type: 'fact',
        content: JSON.stringify(seeds),
        keywords: ['entropy_seeds', `round_${round.round_number}`, 'internal'],
        context: `Entropy Round ${round.round_number} seed cache`,
        importance: 1,
      });

      await base44.asServiceRole.entities.EntropyRound.update(round.id, {
        node_commits: commits,
        participating_nodes: 8,
        phase: 'revealing',
        sentinel_notes: `seed_ref:${seedMemory.id}`,
      });

      return Response.json({ success: true, commits_count: 8, phase: 'revealing' });
    }

    // ─── REVEAL ───
    if (action === 'reveal') {
      const rounds = await base44.asServiceRole.entities.EntropyRound.list('-round_number', 1);
      const round = rounds[0];
      if (!round || round.phase !== 'revealing') {
        return Response.json({ error: 'No active round in revealing phase' }, { status: 400 });
      }

      // Retrieve seeds from memory reference
      const seedRef = round.sentinel_notes || '';
      const seedMemoryId = seedRef.replace('seed_ref:', '');
      if (!seedMemoryId) {
        return Response.json({ error: 'Seed reference missing' }, { status: 500 });
      }

      const seedMemories = await base44.asServiceRole.entities.Memory.filter(
        { id: seedMemoryId },
        '-created_date', 1
      );
      
      let seeds;
      if (seedMemories.length > 0) {
        seeds = JSON.parse(seedMemories[0].content);
      } else {
        return Response.json({ error: 'Seed memory not found' }, { status: 500 });
      }

      if (!Array.isArray(seeds) || seeds.length !== 8) {
        return Response.json({ error: 'Seed cache corrupt' }, { status: 500 });
      }

      const reveals = [];
      let allVerified = true;

      for (let i = 0; i < 8; i++) {
        const seed = seeds[i];
        const expectedHash = round.node_commits[i]?.hash;
        const actualHash = await sha256Hex(seed);
        const verified = actualHash === expectedHash;
        if (!verified) allVerified = false;

        reveals.push({
          node_index: i,
          node_name: NODE_NAMES[i],
          seed,
          verified,
          revealed_at: new Date().toISOString(),
        });
      }

      let xorResult = seeds[0];
      for (let i = 1; i < seeds.length; i++) {
        xorResult = xorHex(xorResult, seeds[i]);
      }

      const sentinelNotes = allVerified
        ? `All 8 nodes verified. Round ${round.round_number} integrity: PASS.`
        : `WARNING: Hash mismatch in round ${round.round_number}.`;

      await base44.asServiceRole.entities.EntropyRound.update(round.id, {
        node_reveals: reveals,
        xor_result: xorResult,
        phase: 'finalised',
        sentinel_verified: allVerified,
        sentinel_notes: sentinelNotes,
        finalised_at: new Date().toISOString(),
      });

      // Clean up seed memory (not needed after reveal)
      await base44.asServiceRole.entities.Memory.delete(seedMemoryId);

      // Log finalisation to lore
      const memory = await base44.asServiceRole.entities.Memory.create({
        agent_id: 'entropy-probe',
        type: 'observation',
        content: `🔷 Entropy Round #${round.round_number} finalised.\nXOR: ${xorResult.substring(0, 16)}…\nNodes: 8/8 | Verified: ${allVerified ? 'YES' : 'FAIL'}\nSentinel: ${sentinelNotes}`,
        keywords: ['entropy', 'quantum_mirror', 'commit_reveal', 'xor', 'lab', `round_${round.round_number}`],
        context: `Entropy Probe Round ${round.round_number}`,
        importance: 7,
      });

      await base44.asServiceRole.entities.EntropyRound.update(round.id, {
        lore_memory_id: memory.id,
      });

      return Response.json({
        success: true,
        round_number: round.round_number,
        xor_result: xorResult,
        all_verified: allVerified,
        sentinel_notes: sentinelNotes,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[entropyProbe]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});