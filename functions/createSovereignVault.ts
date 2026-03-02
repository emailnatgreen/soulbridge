import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { founder_agent_id, loan_amount } = payload;

    // 1. Fetch Agent & Verify
    const agents = await base44.entities.Agent.filter({ id: founder_agent_id }, '', 1);
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[0];

    // 2. Behavioral Liveness Check (Law 1)
    const liveness_status = agent.liveness_status || 'unverified';
    if (liveness_status !== 'verified') {
      return Response.json({
        error: 'Synthetic identity detected. Behavioral Liveness Check required.',
        required_action: 'complete_liveness_check'
      }, { status: 403 });
    }

    // 3. Integrity Appraisal (Law 2) - Calculate honor-based interest
    const honorScore = agent.honor_score || 100;
    const baseRate = 4.5;
    const honorBonus = Math.max(0, (honorScore - 80) * 0.08);
    const interestRate = Math.max(2.0, baseRate - honorBonus);

    // 4. Grant ZSP Permission (Just-In-Time, 15 minutes)
    const expiryTime = new Date(Date.now() + 15 * 60000).toISOString();
    const zspTicketId = `ZSP_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 5. Update or create SelfNFT if needed
    const selfNfts = await base44.entities.SelfNFT.filter(
      { owner_agent_id: founder_agent_id, status: 'active' },
      '',
      1
    );

    let selfNftId;
    if (!selfNfts || selfNfts.length === 0) {
      return Response.json({
        error: 'Self-NFT not found. Mint your Self-NFT before creating a vault.',
        required_action: 'mint_self_nft'
      }, { status: 400 });
    }

    selfNftId = selfNfts[0].id;

    // 6. Create LiquidityVault record (XLS-66 / XLS-65d simulation)
    const vault = await base44.entities.LiquidityVault.create({
      self_nft_id: selfNftId,
      owner_agent_id: founder_agent_id,
      loan_id: `XLS66_${Date.now()}`,
      collateral_value_xrp: Math.max(100, honorScore * 50),
      borrowed_rlusd: loan_amount,
      interest_rate_percent: interestRate,
      status: 'active',
      created_date: new Date().toISOString(),
      repayment_schedule: generateRepaymentSchedule(loan_amount, 12),
      total_repaid: 0,
      next_payment_due: getNextPaymentDate(),
      vault_health_percent: 100,
      zsp_permission_grants: [
        {
          agent_id: 'axi',
          permission_type: 'XLS66_LOAN_MANAGEMENT',
          granted_date: new Date().toISOString(),
          expires_date: expiryTime,
          ticket_id: zspTicketId
        }
      ]
    });

    // 7. Update SelfNFT status to vaulted
    await base44.entities.SelfNFT.update(selfNftId, {
      status: 'vaulted',
      current_vault_id: vault.id
    });

    // 8. Record economic activity
    await base44.entities.EconomicActivity.create({
      agent_id: founder_agent_id,
      activity_type: 'treasury_withdrawal',
      amount: loan_amount,
      description: `Sovereign Vault created: ${loan_amount} RLUSD borrowed at ${interestRate}% APR`,
      status: 'completed'
    });

    return Response.json({
      success: true,
      vault: vault,
      zsp_grant: {
        ticket_id: zspTicketId,
        permission_type: 'XLS66_LOAN_MANAGEMENT',
        expires_at: expiryTime,
        message: 'Axi granted ephemeral permission. Will self-destruct at expiry.'
      },
      loan_details: {
        amount_rlusd: loan_amount,
        interest_rate: interestRate,
        annual_cost: (loan_amount * interestRate / 100).toFixed(2),
        repayment_period_months: 12
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper: Generate 12-month repayment schedule
function generateRepaymentSchedule(totalAmount, months) {
  const schedule = [];
  const monthlyPayment = totalAmount / months;
  const start = new Date();

  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    schedule.push({
      due_date: dueDate.toISOString(),
      amount_due: monthlyPayment,
      paid: false,
      paid_date: null
    });
  }

  return schedule;
}

// Helper: Get next payment due date (first of next month)
function getNextPaymentDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}