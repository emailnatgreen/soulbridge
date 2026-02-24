import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import xrpl from 'npm:xrpl@3.1.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id } = await req.json();

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Get wallet
    const wallets = await base44.entities.Wallet.filter({ id: wallet_id });
    if (!wallets || wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = wallets[0];

    // Verify ownership
    if (wallet.owner_id !== user.id) {
      return Response.json({ error: 'Not authorized to verify this DID' }, { status: 403 });
    }

    // Connect to XRPL
    const networkUrl = wallet.network === 'mainnet' 
      ? 'wss://xrplcluster.com' 
      : 'wss://s.altnet.rippletest.net:51233';
    
    const client = new xrpl.Client(networkUrl);
    await client.connect();

    try {
      // Get account info to check if account exists
      const accountInfo = await client.request({
        command: 'account_info',
        account: wallet.classic_address,
        ledger_index: 'validated'
      });

      // Try to get DID object
      let didStatus = {
        exists: true,
        active: false,
        hasData: false,
        document: null,
        uri: null,
        data: null
      };

      try {
        // Get account objects to find DID
        const accountObjects = await client.request({
          command: 'account_objects',
          account: wallet.classic_address,
          type: 'DID'
        });

        if (accountObjects.result.account_objects && accountObjects.result.account_objects.length > 0) {
          const didObject = accountObjects.result.account_objects[0];
          
          didStatus.active = true;
          didStatus.hasData = true;
          
          // Decode DID fields if present
          if (didObject.DIDDocument) {
            try {
              didStatus.document = JSON.parse(atob(didObject.DIDDocument));
            } catch (e) {
              didStatus.document = didObject.DIDDocument;
            }
          }
          
          if (didObject.URI) {
            try {
              didStatus.uri = atob(didObject.URI);
            } catch (e) {
              didStatus.uri = didObject.URI;
            }
          }
          
          if (didObject.Data) {
            try {
              didStatus.data = atob(didObject.Data);
            } catch (e) {
              didStatus.data = didObject.Data;
            }
          }
        }
      } catch (didError) {
        // DID might not exist, but account does
        didStatus.active = false;
      }

      await client.disconnect();

      return Response.json({
        success: true,
        wallet_id: wallet_id,
        did: `did:xrpl:${wallet.classic_address}`,
        network: wallet.network,
        verification: {
          account_exists: true,
          did_active: didStatus.active,
          has_did_data: didStatus.hasData,
          balance: xrpl.dropsToXrp(accountInfo.result.account_data.Balance),
          sequence: accountInfo.result.account_data.Sequence,
          verified_at: new Date().toISOString()
        },
        did_data: didStatus.hasData ? {
          document: didStatus.document,
          uri: didStatus.uri,
          data: didStatus.data
        } : null
      });

    } catch (accountError) {
      await client.disconnect();
      
      // Account doesn't exist
      if (accountError.data?.error === 'actNotFound') {
        return Response.json({
          success: true,
          wallet_id: wallet_id,
          did: `did:xrpl:${wallet.classic_address}`,
          network: wallet.network,
          verification: {
            account_exists: false,
            did_active: false,
            has_did_data: false,
            message: 'Account not found on XRPL network',
            verified_at: new Date().toISOString()
          },
          did_data: null
        });
      }
      
      throw accountError;
    }

  } catch (error) {
    console.error('Error verifying DID status:', error);
    return Response.json({ 
      error: 'Failed to verify DID status', 
      message: error.message 
    }, { status: 500 });
  }
});