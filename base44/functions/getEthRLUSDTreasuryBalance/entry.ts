/**
 * ETH RLUSD Treasury Balance
 * 
 * Queries the ERC-20 RLUSD balance on Ethereum mainnet
 * for the SoulBridge treasury address derived from ETH_PRIVATE_KEY.
 * 
 * Uses ethers.js to read the RLUSD contract balance.
 * Returns: { address, balance_rlusd, balance_raw, contract_address, network }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { ethers } from 'npm:ethers@6.13.0';

// RLUSD ERC-20 contract on Ethereum mainnet
const RLUSD_CONTRACT = '0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD';

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ethPrivateKey = Deno.env.get('ETH_PRIVATE_KEY');
    if (!ethPrivateKey) {
      return Response.json({ error: 'ETH_PRIVATE_KEY not configured' }, { status: 500 });
    }

    // Derive public address from private key
    const wallet = new ethers.Wallet(ethPrivateKey);
    const treasuryAddress = wallet.address;

    // Try multiple Ethereum RPCs for reliability
    const RPC_ENDPOINTS = [
      'https://rpc.ankr.com/eth',
      'https://ethereum-rpc.publicnode.com',
      'https://1rpc.io/eth',
      'https://eth.llamarpc.com',
    ];

    let provider = null;
    let lastError = null;
    for (const rpc of RPC_ENDPOINTS) {
      try {
        const p = new ethers.JsonRpcProvider(rpc);
        await p.getBlockNumber(); // connectivity check
        provider = p;
        console.log(`[getEthRLUSDTreasuryBalance] Connected via ${rpc}`);
        break;
      } catch (e) {
        lastError = e;
        console.log(`[getEthRLUSDTreasuryBalance] RPC ${rpc} failed: ${e.message}`);
      }
    }
    if (!provider) {
      return Response.json({ error: `All RPCs failed: ${lastError?.message}` }, { status: 502 });
    }

    // RLUSD is 18 decimals, symbol RLUSD — hardcode to avoid extra calls
    const DECIMALS = 18;
    const SYMBOL = 'RLUSD';

    // Query RLUSD balance via raw balanceOf call
    const rlusdContract = new ethers.Contract(RLUSD_CONTRACT, ERC20_ABI, provider);
    const balanceRaw = await rlusdContract.balanceOf(treasuryAddress);
    const balanceFormatted = ethers.formatUnits(balanceRaw, DECIMALS);

    // Also get ETH balance for gas info
    const ethBalance = await provider.getBalance(treasuryAddress);
    const ethFormatted = ethers.formatEther(ethBalance);

    console.log(`[getEthRLUSDTreasuryBalance] Address: ${treasuryAddress}, RLUSD: ${balanceFormatted}, ETH: ${ethFormatted}`);

    return Response.json({
      success: true,
      address: treasuryAddress,
      balance_rlusd: parseFloat(balanceFormatted),
      balance_raw: balanceRaw.toString(),
      symbol: SYMBOL,
      decimals: DECIMALS,
      eth_balance: parseFloat(ethFormatted),
      contract_address: RLUSD_CONTRACT,
      network: 'ethereum_mainnet',
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[getEthRLUSDTreasuryBalance] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});