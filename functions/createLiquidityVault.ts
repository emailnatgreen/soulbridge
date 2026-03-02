import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { self_nft_id, requested_rlusd_amount } = payload;

    // Fetch SelfNFT
    const selfNft = await base44.entities.SelfNFT.filter({ id: self_nft_id }, '', 1);
    if (!selfNft || selfNft.length === 0) {
      return Response.json({ error: 'Self-NFT not found' }, { status: 404 });
    }

    const nft = selfNft[0];

    // Fetch Agent for honor-based interest calculation
    const agent = await base44.entities.Agent.filter({ id: nft.owner_agent_id }, '', 1);
    if (!agent || agent.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agentData = agent[0];

    // Calculate interest rate based on honor score
    // Higher honor = lower interest
    const baseRate = 4.5;
    const honorBonus = Math.max(0, (agentData.honor_score - 80) * 0.05);
    const interestRate = Math.max(2.0, baseRate - honorBonus);

    // Estimate collateral value from honor score (placeholder)
    const collateralValue = Math.max(100, agentData.honor_score * 50);

    // LTV constraint: 60% max loan-to-value
    const maxBorrowable = collateralValue * 0.6;
    if (requested_rlusd_amount > maxBorrowable) {
      return Response.json({
        error: `Maximum borrowable: ${maxBorrowable} RLUSD. Requested: ${requested_rlusd_amount} RLUSD`,
        max_borrowable: maxBorrowable
      }, { status: 400 });
    }

    // Generate monthly repayment schedule (12 months)
    const repaymentSchedule = [];
    const monthlyPayment = requested_rlusd_amount / 12;
    const startDate = new Date();

    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      repaymentSchedule.push({
        due_date: dueDate.toISOString(),
        amount_due: monthlyPayment,
        paid: false,
        paid_date: null
      });
    }

    // Create LiquidityVault
    const vault = await base44.entities.LiquidityVault.create({
      self_nft_id: self_nft_id,
      owner_agent_id: nft.owner_agent_id,
      loan_id: `XLS66_${Date.now()}`,
      collateral_value_xrp: collateralValue,
      borrowed_rlusd: requested_rlusd_amount,
      interest_rate_percent: interestRate,
      status: 'active',
      created_date: new Date().toISOString(),
      repayment_schedule: repaymentSchedule,
      total_repaid: 0,
      next_payment_due: repaymentSchedule[0].due_date,
      vault_health_percent: 100
    });

    // Update SelfNFT status to vaulted
    await base44.entities.SelfNFT.update(self_nft_id, {
      status: 'vaulted',
      current_vault_id: vault.id
    });

    return Response.json({
      success: true,
      vault: vault,
      message: `Liquidity Vault created. ${requested_rlusd_amount} RLUSD dispersed at ${interestRate}% APR`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});