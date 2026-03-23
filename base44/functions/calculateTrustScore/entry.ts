import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate trust score between two DIDs
 * Uses multi-hop trust chains, endorsements, interactions, and network analysis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from_did, to_did, max_depth = 3 } = await req.json();

    if (!from_did || !to_did) {
      return Response.json(
        { error: 'Missing required fields: from_did, to_did' },
        { status: 400 }
      );
    }

    // Get all relevant data
    const [endorsements, messages, credentials, reputations, existingTrust] = await Promise.all([
      base44.entities.DidEndorsement.list('-created_date', 500),
      base44.entities.DidMessage.list('-created_date', 500),
      base44.entities.DidCredential.list('-created_date', 500),
      base44.entities.ReputationScore.list('-overall_score', 500),
      base44.entities.TrustRelationship.filter({ trustor_did: from_did, trustee_did: to_did })
    ]);

    // Build trust graph
    const trustGraph = new Map();
    endorsements.forEach(end => {
      if (!trustGraph.has(end.endorser_did)) {
        trustGraph.set(end.endorser_did, new Map());
      }
      trustGraph.get(end.endorser_did).set(end.endorsed_did, {
        rating: end.rating,
        type: end.endorsement_type,
        strength: end.relationship_strength
      });
    });

    // Find trust paths using BFS
    const findTrustPaths = (start, end, maxDepth) => {
      const paths = [];
      const queue = [[start]];
      const visited = new Set();

      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (path.length > maxDepth + 1) continue;
        if (visited.has(current) && current !== start) continue;
        visited.add(current);

        if (current === end && path.length > 1) {
          paths.push(path);
          continue;
        }

        const neighbors = trustGraph.get(current);
        if (neighbors) {
          for (const [neighbor, data] of neighbors) {
            if (!path.includes(neighbor)) {
              queue.push([...path, neighbor]);
            }
          }
        }
      }

      return paths;
    };

    const trustPaths = findTrustPaths(from_did, to_did, max_depth);

    // Calculate direct trust factors
    const directEndorsements = endorsements.filter(
      e => e.endorser_did === from_did && e.endorsed_did === to_did
    );
    
    const directMessages = messages.filter(
      m => (m.from_did === from_did && m.to_did === to_did) ||
           (m.from_did === to_did && m.to_did === from_did)
    );

    const credentialsIssued = credentials.filter(
      c => c.issuer_did === from_did && c.subject_did === to_did && c.status === 'active'
    );

    const targetReputation = reputations.find(
      r => `did:xrpl:${r.did_classic_address}` === to_did
    );

    // Count shared connections
    const fromConnections = new Set(
      endorsements.filter(e => e.endorser_did === from_did).map(e => e.endorsed_did)
    );
    const toConnections = new Set(
      endorsements.filter(e => e.endorser_did === to_did).map(e => e.endorsed_did)
    );
    const sharedConnections = [...fromConnections].filter(c => toConnections.has(c)).length;

    // Calculate trust components
    let directTrustScore = 0;
    let pathTrustScore = 0;
    let reputationBonus = 0;
    let interactionBonus = 0;

    // Direct trust (40% weight)
    if (directEndorsements.length > 0) {
      const avgRating = directEndorsements.reduce((sum, e) => sum + e.rating, 0) / directEndorsements.length;
      directTrustScore = (avgRating / 5) * 40;
    }

    // Path trust (30% weight) - strongest path
    if (trustPaths.length > 0) {
      const pathScores = trustPaths.map(path => {
        let score = 100;
        for (let i = 0; i < path.length - 1; i++) {
          const edge = trustGraph.get(path[i])?.get(path[i + 1]);
          if (edge) {
            score *= (edge.rating / 5);
          }
        }
        // Decay by path length
        score *= Math.pow(0.8, path.length - 2);
        return score;
      });
      pathTrustScore = Math.max(...pathScores) * 0.3;
    }

    // Reputation bonus (15% weight)
    if (targetReputation) {
      reputationBonus = (targetReputation.overall_score / 100) * 15;
    }

    // Interaction bonus (15% weight)
    const interactionScore = Math.min(100, 
      (directMessages.length * 2) + 
      (credentialsIssued.length * 10) +
      (sharedConnections * 5)
    );
    interactionBonus = (interactionScore / 100) * 15;

    // Calculate final trust score
    const calculatedTrustScore = Math.round(
      directTrustScore + pathTrustScore + reputationBonus + interactionBonus
    );

    // Calculate confidence (based on data availability)
    const dataPoints = 
      (directEndorsements.length > 0 ? 25 : 0) +
      (trustPaths.length > 0 ? 25 : 0) +
      (directMessages.length > 0 ? 25 : 0) +
      (targetReputation ? 25 : 0);

    const confidenceScore = dataPoints;

    // Determine trust type
    let trustType = 'direct';
    let trustPath = [from_did, to_did];
    let pathLength = 1;

    if (directEndorsements.length === 0 && trustPaths.length > 0) {
      trustType = 'derived';
      const bestPath = trustPaths.reduce((best, current) => 
        current.length < best.length ? current : best
      );
      trustPath = bestPath;
      pathLength = bestPath.length - 1;
    }

    // Create or update trust relationship
    const trustData = {
      trustor_did: from_did,
      trustee_did: to_did,
      trust_level: directEndorsements.length > 0 
        ? Math.round(directEndorsements[0].rating * 20) 
        : calculatedTrustScore,
      calculated_trust_score: calculatedTrustScore,
      trust_type: trustType,
      trust_category: 'general',
      trust_path: trustPath,
      path_length: pathLength,
      confidence_score: confidenceScore,
      based_on: {
        endorsements_count: directEndorsements.length,
        messages_exchanged: directMessages.length,
        shared_connections: sharedConnections,
        credentials_issued: credentialsIssued.length,
        interaction_history: directMessages.length + directEndorsements.length
      },
      status: 'active',
      last_calculated: new Date().toISOString(),
      auto_update: true
    };

    // Get wallet IDs
    const fromAddress = from_did.split(':')[2];
    const toAddress = to_did.split(':')[2];
    const fromWallets = await base44.entities.Wallet.filter({ classic_address: fromAddress });
    const toWallets = await base44.entities.Wallet.filter({ classic_address: toAddress });

    if (fromWallets.length > 0 && toWallets.length > 0) {
      trustData.trustor_wallet_id = fromWallets[0].id;
      trustData.trustee_wallet_id = toWallets[0].id;
    }

    let trustRelationship;
    if (existingTrust.length > 0) {
      trustRelationship = await base44.asServiceRole.entities.TrustRelationship.update(
        existingTrust[0].id,
        trustData
      );
    } else {
      trustRelationship = await base44.asServiceRole.entities.TrustRelationship.create(trustData);
    }

    return Response.json({
      success: true,
      trust_score: calculatedTrustScore,
      confidence: confidenceScore,
      trust_type: trustType,
      path_length: pathLength,
      trust_path: trustPath,
      breakdown: {
        direct_trust: Math.round(directTrustScore),
        path_trust: Math.round(pathTrustScore),
        reputation_bonus: Math.round(reputationBonus),
        interaction_bonus: Math.round(interactionBonus)
      },
      factors: trustData.based_on,
      trust_relationship: trustRelationship,
      available_paths: trustPaths.length
    });

  } catch (error) {
    console.error('Error calculating trust score:', error);
    return Response.json(
      { error: 'Failed to calculate trust score', message: error.message },
      { status: 500 }
    );
  }
});