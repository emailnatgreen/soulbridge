import { ethers } from 'npm:ethers@6.13.0';

Deno.serve(async (req) => {
    try {
        const privateKey = Deno.env.get("ETH_PRIVATE_KEY");
        
        if (!privateKey) {
            return Response.json({ error: "ETH_PRIVATE_KEY not configured" }, { status: 500 });
        }

        const wallet = new ethers.Wallet(privateKey);
        
        return Response.json({ 
            address: wallet.address,
            message: "Send RLUSD to this address"
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});