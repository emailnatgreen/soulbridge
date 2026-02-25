import { ethers } from 'npm:ethers@6.13.0';

const RLUSD_CONTRACT = "0xCfd748B9De538c9f5b1805e8db9e1d4671f7F2ec";
const ETH_RPC = "https://ethereum.publicnode.com";

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

Deno.serve(async (req) => {
    try {
        const privateKey = Deno.env.get("ETH_PRIVATE_KEY");
        
        if (!privateKey) {
            return Response.json({ error: "ETH_PRIVATE_KEY not configured" }, { status: 500 });
        }

        const provider = new ethers.JsonRpcProvider(ETH_RPC);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const rlusdContract = new ethers.Contract(RLUSD_CONTRACT, ERC20_ABI, provider);
        
        const decimals = await rlusdContract.decimals();
        const balance = await rlusdContract.balanceOf(wallet.address);
        
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        return Response.json({ 
            address: wallet.address,
            balance: formattedBalance,
            balanceRaw: balance.toString()
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});