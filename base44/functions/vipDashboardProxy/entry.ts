import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Proxy for VIP invite guests to interact with wallets without auth.
 * Validates invite session token before executing any action.
 * Handles XRPL calls directly using service role for wallet data.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, wallet_id, invite_token_id, params } = body;

    if (!invite_token_id) {
      return Response.json({ error: 'Invite token required' }, { status: 401 });
    }

    if (!action) {
      return Response.json({ error: 'Action required' }, { status: 400 });
    }

    // Validate the invite token
    const tokens = await base44.asServiceRole.entities.InvitationToken.filter({
      token_id: invite_token_id.trim().toUpperCase()
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'Invalid invite token' }, { status: 403 });
    }

    const token = tokens[0];
    if (token.status !== 'claimed' && token.status !== 'active') {
      return Response.json({ error: 'Invite token is no longer valid' }, { status: 403 });
    }

    // Helper: get wallet record (VIP only)
    const getVipWallet = async (wId) => {
      const w = await base44.asServiceRole.entities.Wallet.get(wId);
      if (!w) throw new Error('Wallet not found');
      const isVip = (w.name && w.name.toLowerCase().includes('vip')) || (w.notes && w.notes.toLowerCase().includes('vip'));
      if (!isVip) throw new Error('Access denied — not a VIP wallet');
      return w;
    };

    // Helper: XRPL RPC call
    const xrplRpc = async (address, method, extraParams = {}) => {
      const rpcUrl = 'https://xrplcluster.com';
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params: [{ account: address, ledger_index: 'validated', ...extraParams }] }),
        signal: AbortSignal.timeout(10000),
      });
      return res.json();
    };

    switch (action) {
      case 'refreshWallets': {
        const [allWallets, allAgents] = await Promise.all([
          base44.asServiceRole.entities.Wallet.list('-created_date', 100),
          base44.asServiceRole.entities.Agent.list('-created_date', 100),
        ]);

        const vipWallets = (allWallets || []).filter(w =>
          (w.name && w.name.toLowerCase().includes('vip')) ||
          (w.notes && w.notes.toLowerCase().includes('vip'))
        );

        const safeWallets = vipWallets.map(w => ({
          id: w.id, name: w.name, classic_address: w.classic_address,
          network: w.network, balance: w.balance, is_published: w.is_published,
          published_at: w.published_at, published_txid: w.published_txid,
          notes: w.notes, owner_id: w.owner_id,
        }));

        const safeAgents = (allAgents || []).map(a => ({
          id: a.id, name: a.name, role: a.role, honor_score: a.honor_score,
          status: a.status, avatar_url: a.avatar_url, purpose: a.purpose,
        }));

        return Response.json({ wallets: safeWallets, agents: safeAgents });
      }

      case 'getBalance': {
        const w = await getVipWallet(wallet_id);
        if (!w.classic_address) return Response.json({ error: 'No address' }, { status: 400 });
        try {
          const data = await xrplRpc(w.classic_address, 'account_info');
          const balance = data?.result?.account_data?.Balance
            ? parseFloat(data.result.account_data.Balance) / 1_000_000
            : w.balance ?? 0;
          // Persist
          await base44.asServiceRole.entities.Wallet.update(wallet_id, { balance, last_accessed: new Date().toISOString() }).catch(() => {});
          return Response.json({ success: true, balance, classic_address: w.classic_address });
        } catch (e) {
          return Response.json({ success: true, balance: w.balance ?? 0, classic_address: w.classic_address, cached: true });
        }
      }

      case 'getWalletTrustlines': {
        const w = await getVipWallet(wallet_id);
        if (!w.classic_address) return Response.json({ error: 'No address' }, { status: 400 });
        try {
          const data = await xrplRpc(w.classic_address, 'account_lines');
          const lines = data?.result?.lines || [];
          const trustlines = lines.map(l => ({
            currency: l.currency,
            balance: l.balance,
            limit: l.limit,
            account: l.account,
          }));
          return Response.json({ trustlines });
        } catch (e) {
          return Response.json({ trustlines: [] });
        }
      }

      case 'publishDID': {
        const w = await getVipWallet(wallet_id);
        if (!w.classic_address) return Response.json({ error: 'No address' }, { status: 400 });

        // Decrypt seed
        const encKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
        if (!encKey) return Response.json({ error: 'Encryption key not configured' }, { status: 500 });

        let seed;
        if (w.encrypted_seed && w.encryption_iv && w.encryption_salt) {
          // AES-256-GCM decryption
          const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(encKey), 'PBKDF2', false, ['deriveKey']);
          const salt = Uint8Array.from(atob(w.encryption_salt), c => c.charCodeAt(0));
          const derivedKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
          );
          const iv = Uint8Array.from(atob(w.encryption_iv), c => c.charCodeAt(0));
          const encData = Uint8Array.from(atob(w.encrypted_seed), c => c.charCodeAt(0));
          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, encData);
          seed = new TextDecoder().decode(decrypted);
        } else {
          return Response.json({ error: 'Wallet seed not available' }, { status: 400 });
        }

        // Publish DID using xrpl.js
        const xrpl = await import('npm:xrpl@4.2.0');
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();

        try {
          const wallet_xrpl = xrpl.Wallet.fromSeed(seed);
          const didDoc = JSON.stringify({
            id: `did:xrpl:1:${w.classic_address}`,
            type: 'SoulBridge Sovereign DID',
            created: new Date().toISOString(),
            controller: w.classic_address,
          });

          const hexData = Buffer.from(didDoc).toString('hex').toUpperCase();

          const tx = {
            TransactionType: 'DIDSet',
            Account: w.classic_address,
            Data: hexData,
          };

          const prepared = await client.autofill(tx);
          const signed = wallet_xrpl.sign(prepared);
          const result = await client.submitAndWait(signed.tx_blob);

          if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            await base44.asServiceRole.entities.Wallet.update(wallet_id, {
              is_published: true,
              published_at: new Date().toISOString(),
              published_txid: result.result.hash,
            });
            return Response.json({ success: true, txid: result.result.hash, address: w.classic_address });
          } else {
            return Response.json({ success: false, error: result.result.meta.TransactionResult });
          }
        } finally {
          await client.disconnect();
        }
      }

      case 'addRLUSDTrustline': {
        const w = await getVipWallet(wallet_id);
        if (!w.classic_address) return Response.json({ error: 'No address' }, { status: 400 });

        // Check if already exists
        try {
          const lineData = await xrplRpc(w.classic_address, 'account_lines');
          const lines = lineData?.result?.lines || [];
          const hasRLUSD = lines.some(l => l.currency === 'RLUSD' || l.currency === '524C555344000000000000000000000000000000');
          if (hasRLUSD) return Response.json({ success: true, already_exists: true });
        } catch (_) {}

        // Decrypt seed
        const encKey2 = Deno.env.get('WALLET_ENCRYPTION_KEY');
        if (!encKey2) return Response.json({ error: 'Encryption key not configured' }, { status: 500 });

        let seed2;
        if (w.encrypted_seed && w.encryption_iv && w.encryption_salt) {
          const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(encKey2), 'PBKDF2', false, ['deriveKey']);
          const salt = Uint8Array.from(atob(w.encryption_salt), c => c.charCodeAt(0));
          const derivedKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
          );
          const iv = Uint8Array.from(atob(w.encryption_iv), c => c.charCodeAt(0));
          const encData = Uint8Array.from(atob(w.encrypted_seed), c => c.charCodeAt(0));
          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, encData);
          seed2 = new TextDecoder().decode(decrypted);
        } else {
          return Response.json({ error: 'Wallet seed not available' }, { status: 400 });
        }

        const xrpl2 = await import('npm:xrpl@4.2.0');
        const client2 = new xrpl2.Client('wss://xrplcluster.com');
        await client2.connect();

        try {
          const wallet_xrpl2 = xrpl2.Wallet.fromSeed(seed2);
          const tx = {
            TransactionType: 'TrustSet',
            Account: w.classic_address,
            LimitAmount: {
              currency: 'RLUSD',
              issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
              value: '10000000',
            },
          };
          const prepared = await client2.autofill(tx);
          const signed = wallet_xrpl2.sign(prepared);
          const result = await client2.submitAndWait(signed.tx_blob);

          if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return Response.json({ success: true, transaction_hash: result.result.hash });
          } else {
            return Response.json({ success: false, error: result.result.meta.TransactionResult });
          }
        } finally {
          await client2.disconnect();
        }
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('vipDashboardProxy error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});