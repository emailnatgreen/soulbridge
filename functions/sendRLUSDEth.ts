import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { ethers } from 'npm:ethers@6.13.0';

// RLUSD ERC-20 Token Configuration on Ethereum Mainnet
const RLUSD_CONTRACT_ADDRESS = '0xCfd748B9De538c9f5b1805e8db9e1d4671f7F2ec';
const ETHEREUM_RPC_URL = 'https://eth.llamarpc.com'; // Free public RPC

// ERC-20 ABI (minimal - only what we need for transfer)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_address, amount, note } = await req.json();

    if (!recipient_address || !amount) {
      return Response.json({ 
        error: 'recipient_address and amount are required' 
      }, { status: 400 });
    }

    // Validate Ethereum address
    if (!ethers.isAddress(recipient_address)) {
      return Response.json({ 
        error: 'Invalid Ethereum address' 
      }, { status: 400 });
    }

    const privateKey = Deno.env.get('ETH_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ 
        error: 'ETH_PRIVATE_KEY not configured' 
      }, { status: 500 });
    }

    // Connect to Ethereum
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract instance
    const rlusdContract = new ethers.Contract(
      RLUSD_CONTRACT_ADDRESS,
      ERC20_ABI,
      wallet
    );

    // Get token decimals
    const decimals = await rlusdContract.decimals();
    
    // Convert amount to token units (RLUSD typically has 6 decimals)
    const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);

    // Check balance
    const balance = await rlusdContract.balanceOf(wallet.address);
    if (balance < amountInTokenUnits) {
      return Response.json({ 
        error: 'Insufficient RLUSD balance in shielded wallet',
        balance: ethers.formatUnits(balance, decimals)
      }, { status: 400 });
    }

    // Send RLUSD
    const tx = await rlusdContract.transfer(recipient_address, amountInTokenUnits);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      // Create transaction record in database
      await base44.asServiceRole.entities.Transaction.create({
        recipient_address: recipient_address,
        amount: parseFloat(amount),
        note: note || `RLUSD sent via Ethereum`,
        status: 'completed',
        hash: receipt.hash
      });

      return Response.json({
        success: true,
        transaction_hash: receipt.hash,
        amount: amount,
        recipient: recipient_address,
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        message: `Successfully sent ${amount} RLUSD on Ethereum`,
        explorer_url: `https://etherscan.io/tx/${receipt.hash}`
      });
    } else {
      return Response.json({
        success: false,
        error: 'Transaction failed',
        message: 'Transaction was not successful'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending RLUSD on Ethereum:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});