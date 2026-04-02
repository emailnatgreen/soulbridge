import * as xrpl from 'npm:xrpl@2.14.0';

// Reliable XRPL connector with retry logic and timeout management
const XRPL_ENDPOINTS = {
  mainnet: 'wss://xrpl.ws',
  testnet: 'wss://testnet.xrpl.ws'
};

const MAX_RETRIES = 3;
const BASE_TIMEOUT = 5000; // 5s
const RETRY_DELAY = 1000; // 1s

// Exponential backoff retry wrapper
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('XRPL request timeout')), BASE_TIMEOUT * (attempt + 1))
        )
      ]);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Get XRPL client for network
function getXrplClient(network = 'mainnet') {
  const endpoint = XRPL_ENDPOINTS[network] || XRPL_ENDPOINTS.mainnet;
  return new xrpl.Client(endpoint, { connectionTimeout: BASE_TIMEOUT });
}

// Verify DID status on XRPL
export async function verifyDIDStatusReliable(classicAddress, network = 'mainnet') {
  const client = getXrplClient(network);
  
  try {
    await client.connect();
    
    const accountInfo = await retryWithBackoff(async () => {
      return await client.request({
        command: 'account_info',
        account: classicAddress
      });
    });

    if (!accountInfo?.account_data) {
      return {
        success: false,
        account_exists: false,
        network,
        address: classicAddress,
        error: 'Account not found on XRPL'
      };
    }

    // Check if DID document exists (NFT or similar)
    const nfts = await retryWithBackoff(async () => {
      return await client.request({
        command: 'account_nfts',
        account: classicAddress
      });
    });

    const didActive = nfts?.account_nfts?.some(nft => 
      nft.URI && nft.URI.includes('did')
    ) || false;

    return {
      success: true,
      account_exists: true,
      did_active: didActive,
      balance: accountInfo.account_data?.Balance ? parseFloat(accountInfo.account_data.Balance) / 1000000 : 0,
      network,
      address: classicAddress,
      verified_at: new Date().toISOString(),
      ledger_index: accountInfo.ledger_index
    };
  } catch (error) {
    console.error(`XRPL verification failed after retries:`, error);
    return {
      success: false,
      error: error.message,
      network,
      address: classicAddress,
      is_network_error: error.message.includes('timeout') || error.message.includes('connect')
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
}

// Check XRPL network health
export async function checkXRPLHealth(network = 'mainnet') {
  const client = getXrplClient(network);
  
  try {
    await client.connect();
    const ledger = await Promise.race([
      client.request({ command: 'ledger' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 3000))
    ]);
    
    await client.disconnect();
    
    return {
      healthy: true,
      network,
      ledger_index: ledger.ledger_index,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`XRPL health check failed:`, error);
    return {
      healthy: false,
      network,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const { action, classic_address, network = 'mainnet' } = await req.json();

    if (action === 'verify') {
      if (!classic_address) {
        return Response.json({ error: 'Missing classic_address' }, { status: 400 });
      }
      const result = await verifyDIDStatusReliable(classic_address, network);
      return Response.json(result);
    }

    if (action === 'health') {
      const result = await checkXRPLHealth(network);
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('XRPL connector error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});