import { ethers } from 'npm:ethers@6.13.0';

const RLUSD_CONTRACT = "0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD";
const ETH_RPC = "https://ethereum.publicnode.com";

async function ethCall(to, data) {
    const res = await fetch(ETH_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'eth_call',
            params: [{ to, data }, 'latest']
        })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
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

        const [balanceHex, decimalsHex] = await Promise.all([
            ethCall(RLUSD_CONTRACT, balanceData),
            ethCall(RLUSD_CONTRACT, '0x313ce567')
        ]);

        const decimals = parseInt(decimalsHex, 16);
        const balance = formatUnits(balanceHex, decimals);

        return Response.json({ address, balance, balanceRaw: BigInt(balanceHex).toString() });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});