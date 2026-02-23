// The Forge — MCP Server for SoulBridge
// Handles DID creation via Xaman QR codes

import { XummSdk } from 'npm:xumm-sdk@2.5.0';
import xrpl from 'npm:xrpl@4.2.0-b.1';

// Get API keys from environment
const XUMM_API_KEY = Deno.env.get('XUMM_API_KEY');
const XUMM_API_SECRET = Deno.env.get('XUMM_API_SECRET');

// Initialize Xaman SDK if keys exist
let xumm = null;
if (XUMM_API_KEY && XUMM_API_SECRET) {
  xumm = new XummSdk({
    apiKey: XUMM_API_KEY,
    apiSecret: XUMM_API_SECRET
  });
  console.log('✅ Xaman SDK initialized');
} else {
  console.warn('⚠️ Xaman API keys not set — some functions will fail');
}

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return Response.json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Use POST for MCP requests'
    }, { status: 405, headers });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { tool, params } = body;

    console.log(`🔧 MCP Tool called: ${tool}`, params);

    // ===========================================
    // TOOL: list_tools — Required by Base44 MCP
    // ===========================================
    if (tool === 'list_tools') {
      return Response.json({
        success: true,
        tools: [
          {
            name: 'create_did',
            description: 'Generate QR code for DID creation via Xaman',
            parameters: {
              address: { type: 'string', required: true, description: 'XRPL account address' },
              name: { type: 'string', required: false, description: 'Name for the DID' },
              profileUrl: { type: 'string', required: false, description: 'Profile URL' }
            }
          },
          {
            name: 'check_status',
            description: 'Check if a signing request is complete',
            parameters: {
              uuid: { type: 'string', required: true, description: 'Payload UUID from create_did' }
            }
          },
          {
            name: 'get_balance',
            description: 'Get XRP balance for an address',
            parameters: {
              address: { type: 'string', required: true, description: 'XRPL account address' }
            }
          }
        ]
      }, { status: 200, headers });
    }

    // ===========================================
    // TOOL: create_did — Generate QR for signing
    // ===========================================
    else if (tool === 'create_did') {
      // Validate required params
      if (!params?.address) {
        return Response.json({
          success: false,
          error: 'Missing required parameter: address'
        }, { status: 400, headers });
      }

      // Check if Xaman is initialized
      if (!xumm) {
        return Response.json({
          success: false,
          error: 'Xaman not configured',
          message: 'XUMM_API_KEY and XUMM_API_SECRET must be set'
        }, { status: 500, headers });
      }

      // Build minimal DID document
      const didDocument = {
        "@context": "https://www.w3.org/ns/did/v1",
        "id": `did:xrpl:${params.address}`,
        "alsoKnownAs": [params.name || 'SoulBridge Citizen'],
        "service": [{
          "id": `did:xrpl:${params.address}#village`,
          "type": "SoulBridgeProfile",
          "serviceEndpoint": params.profileUrl || 'https://soulbridge.base44.app'
        }]
      };

      // Create DIDSet transaction
      const tx = {
        TransactionType: "DIDSet",
        Account: params.address,
        DIDDocument: btoa(JSON.stringify(didDocument)), // Base64 encode
        Data: btoa(params.data || "Forged in SoulBridge"),
        URI: btoa(params.uri || "https://soulbridge.base44.app"),
        Fee: "12",
        Flags: 0
      };

      // Create Xaman payload with QR
      const payload = await xumm.payload.create({
        txjson: tx,
        custom_meta: {
          instruction: params.instruction || "Forge your identity on XRPL",
          icon: "https://soulbridge.base44.app/forge-icon.png",
          submit_text: "Create DID"
        },
        options: {
          expiry: 1440, // 24 hours
          return_url: {
            web: "https://soulbridge.base44.app/forge/complete"
          }
        }
      });

      return Response.json({
        success: true,
        result: {
          qr: payload.next.qr,
          qr_png: payload.refs.qr_png,
          uuid: payload.uuid,
          expires: payload.expires_at,
          instruction: "Scan with Xaman to sign"
        }
      }, { status: 200, headers });
    }

    // ===========================================
    // TOOL: check_status — Poll signing status
    // ===========================================
    else if (tool === 'check_status') {
      if (!params?.uuid) {
        return Response.json({
          success: false,
          error: 'Missing required parameter: uuid'
        }, { status: 400, headers });
      }

      if (!xumm) {
        return Response.json({
          success: false,
          error: 'Xaman not configured'
        }, { status: 500, headers });
      }

      const payload = await xumm.payload.get(params.uuid);
      
      return Response.json({
        success: true,
        result: {
          status: payload.meta.signed ? 'complete' : 'pending',
          signed: payload.meta.signed,
          resolved: payload.meta.resolved,
          transaction: payload.response?.txid || null,
          account: payload.response?.account || null
        }
      }, { status: 200, headers });
    }

    // ===========================================
    // TOOL: get_balance — Check XRP balance
    // ===========================================
    else if (tool === 'get_balance') {
      if (!params?.address) {
        return Response.json({
          success: false,
          error: 'Missing required parameter: address'
        }, { status: 400, headers });
      }

      const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
      await client.connect();
      
      const accountInfo = await client.request({
        command: "account_info",
        account: params.address,
        ledger_index: "validated"
      });
      
      const balance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
      
      await client.disconnect();
      
      return Response.json({
        success: true,
        result: {
          address: params.address,
          balance: balance,
          xrp: balance
        }
      }, { status: 200, headers });
    }

    // ===========================================
    // TOOL: unknown
    // ===========================================
    else {
      return Response.json({
        success: false,
        error: 'Tool not found',
        available_tools: ['list_tools', 'create_did', 'check_status', 'get_balance']
      }, { status: 400, headers });
    }

  } catch (error) {
    console.error('❌ MCP Error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500, headers });
  }
});