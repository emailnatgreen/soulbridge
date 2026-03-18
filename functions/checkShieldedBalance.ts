import { ethers } from 'npm:ethers@6.13.0';

const RLUSD_CONTRACT = "0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD";
const ETH_RPCS = [
    "https://ethereum.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
    "https://eth.llamarpc.com",
];

async function ethCall(rpcUrl, to, data) {
    const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'eth_call',
            params: [{ to, data }, 'latest']
        }),
        signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const json = JSON.parse(text);
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    if (!json.result) throw new Error('No result from RPC');
    return json.result;
}

function formatUnits(hexValue, decimals = 18) {
    const bigVal = BigInt(hexValue);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = bigVal / divisor;
    const remainder = bigVal % divisor;
    const remainderStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
    return remainderStr.length > 0 ? `${whole}.${remainderStr}` : `${whole}`;
}

Deno.serve(async (req) => {
    try {
        const privateKey = Deno.env.get("ETH_PRIVATE_KEY");
        if (!privateKey) {
            return Response.json({ error: "ETH_PRIVATE_KEY not configured" }, { status: 500 });
        }

        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;

        const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
        const balanceData = `0x70a08231${paddedAddress}`;

        let lastError = null;
        for (const rpcUrl of ETH_RPCS) {
            try {
                // Try balance call first with timeout
                const balanceHex = await ethCall(rpcUrl, RLUSD_CONTRACT, balanceData);
                // If balance works, get decimals
                const decimalsHex = await ethCall(rpcUrl, RLUSD_CONTRACT, '0x313ce567');
                const decimals = parseInt(decimalsHex, 16);
                const balance = formatUnits(balanceHex, decimals);
                return Response.json({ address, balance, balanceRaw: BigInt(balanceHex).toString() });
            } catch (err) {
                console.log(`RPC ${rpcUrl} failed:`, err.message);
                lastError = err;
                // Continue to next RPC endpoint
            }
        }

        return Response.json({ error: lastError?.message || 'All RPC endpoints failed' }, { status: 500 });
    } catch (error) {
        console.error('checkShieldedBalance error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});