import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin only
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all wallets
    const allWallets = await base44.asServiceRole.entities.Wallet.list('-created_date', 1000);
    
    // Group by classic_address
    const grouped = {};
    allWallets.forEach(w => {
      const addr = w.classic_address;
      if (!grouped[addr]) grouped[addr] = [];
      grouped[addr].push(w);
    });

    // Find duplicates and score each
    const duplicates = Object.entries(grouped)
      .filter(([addr, wallets]) => wallets.length > 1)
      .map(([addr, wallets]) => {
        // Score each wallet: published=10pts, balance>0=5pts, encrypted_seed=3pts
        const scored = wallets.map(w => ({
          wallet: w,
          score: (w.is_published ? 10 : 0) + (Number(w.balance || 0) > 0 ? 5 : 0) + (w.encrypted_seed ? 3 : 0)
        }));
        
        // Sort descending, keep highest scored, mark rest for deletion
        scored.sort((a, b) => b.score - a.score);
        return {
          address: addr,
          keep: scored[0].wallet,
          keepScore: scored[0].score,
          delete: scored.slice(1).map(s => ({ wallet: s.wallet, score: s.score }))
        };
      });

    // Execute deletions
    let deletedCount = 0;
    const deletedWallets = [];
    
    for (const dup of duplicates) {
      for (const item of dup.delete) {
        try {
          await base44.asServiceRole.entities.Wallet.delete(item.wallet.id);
          deletedCount++;
          deletedWallets.push({
            id: item.wallet.id,
            name: item.wallet.name,
            address: dup.address,
            score: item.score,
            reason: 'Lower scored duplicate'
          });
          console.log(`Deleted duplicate wallet: ${item.wallet.name} (${dup.address})`);
        } catch (err) {
          console.error(`Failed to delete wallet ${item.wallet.id}:`, err.message);
        }
      }
    }

    return Response.json({
      success: true,
      duplicateGroupsFound: duplicates.length,
      totalWalletsDeleted: deletedCount,
      summary: duplicates.map(d => ({
        address: d.address,
        kept: { id: d.keep.id, name: d.keep.name, score: d.keepScore },
        deletedCount: d.delete.length
      })),
      deletedWallets
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});