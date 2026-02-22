import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id, transactions } = await req.json();

        if (!wallet_id || !transactions) {
            return Response.json({ error: 'wallet_id and transactions are required' }, { status: 400 });
        }

        // Verify wallet ownership
        const wallet = await base44.entities.Wallet.get(wallet_id);
        if (!wallet || wallet.owner_id !== user.id) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        // Prepare transaction summary for AI
        const txSummary = {
            total_transactions: transactions.length,
            xrp_transactions: transactions.filter(t => t.currency === 'XRP'),
            rlusd_transactions: transactions.filter(t => t.currency === 'RLUSD'),
            sent_count: transactions.filter(t => t.direction === 'sent').length,
            received_count: transactions.filter(t => t.direction === 'received').length,
            trustlines: transactions.filter(t => t.type === 'TrustLine'),
            recent_transactions: transactions.slice(0, 20)
        };

        // AI Analysis
        const analysisResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this XRPL wallet activity and provide insights:

Wallet Summary:
- Total Transactions: ${txSummary.total_transactions}
- XRP Transactions: ${txSummary.xrp_transactions.length}
- RLUSD Transactions: ${txSummary.rlusd_transactions.length}
- Sent: ${txSummary.sent_count} | Received: ${txSummary.received_count}
- TrustLines Set: ${txSummary.trustlines.length}

Recent Transactions:
${JSON.stringify(txSummary.recent_transactions, null, 2)}

Provide:
1. Spending patterns analysis
2. Anomaly detection for unusual RLUSD activity
3. Security recommendations based on wallet behavior
4. Suggested trustlines for common tokens (if applicable)
5. Risk assessment (low/medium/high) with reasoning

Be concise and actionable.`,
            response_json_schema: {
                type: "object",
                properties: {
                    spending_patterns: {
                        type: "object",
                        properties: {
                            summary: { type: "string" },
                            insights: { type: "array", items: { type: "string" } }
                        }
                    },
                    anomaly_detection: {
                        type: "object",
                        properties: {
                            anomalies_found: { type: "boolean" },
                            details: { type: "array", items: { type: "string" } }
                        }
                    },
                    security_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                priority: { type: "string" },
                                recommendation: { type: "string" }
                            }
                        }
                    },
                    suggested_trustlines: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                currency: { type: "string" },
                                issuer: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    risk_assessment: {
                        type: "object",
                        properties: {
                            level: { type: "string" },
                            reasoning: { type: "string" }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            wallet_id,
            analysis: analysisResult,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing wallet activity:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});