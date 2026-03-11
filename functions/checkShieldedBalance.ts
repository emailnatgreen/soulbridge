const RLUSD_CONTRACT = "0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD";
const ETH_RPC = "https://ethereum.publicnode.com";

function hexToDecimal(hex) {
    return BigInt(hex).toString();
}

function formatUnits(value, decimals = 18) {
    const bigVal = BigInt(value);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = bigVal / divisor;
    const remainder = bigVal % divisor;
    const remainderStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
    return remainderStr.length > 0 ? `${whole}.${remainderStr}` : `${whole}`;
}

// Derive Ethereum address from private key using Web Crypto
async function getAddressFromPrivateKey(privateKeyHex) {
    const keyBytes = Uint8Array.from(privateKeyHex.replace('0x', '').match(/.{1,2}/g).map(b => parseInt(b, 16)));
    // Import as raw EC key
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        true, []
    );
    // For Ethereum we need secp256k1 which Web Crypto doesn't support natively
    // Fall back to ethers just for address derivation (lightweight)
    return null;
}

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

Deno.serve(async (req) => {
    try {
        const privateKey = Deno.env.get("ETH_PRIVATE_KEY");
        if (!privateKey) {
            return Response.json({ error: "ETH_PRIVATE_KEY not configured" }, { status: 500 });
        }

        // Derive address using ethers (minimal import)
        const { ethers } = await import('npm:ethers@6.13.0/ethers');
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;

        // balanceOf(address) selector = 0x70a08231
        const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
        const balanceData = `0x70a08231${paddedAddress}`;

        // decimals() selector = 0x313ce567
        const [balanceHex, decimalsHex] = await Promise.all([
            ethCall(RLUSD_CONTRACT, balanceData),
            ethCall(RLUSD_CONTRACT, '0x313ce567')
        ]);

        const decimals = parseInt(decimalsHex, 16);
        const balanceRaw = hexToDecimal(balanceHex);
        const balance = formatUnits(balanceRaw, decimals);

        return Response.json({ address, balance, balanceRaw });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});