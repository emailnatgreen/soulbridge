import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Entry criteria thresholds
const CRITERIA = {
  minConfidence: 65,          // Minimum AI confidence to generate a signal
  strongSignalThreshold: 80,  // Above this = strong signal
  volatilityBuyBoost: true,   // High volatility can boost signal on confirmed trend
  minPriceChange24h: 1.5,     // Minimum 24h % move to consider (absolute value)
};

function calcExpiry(timeframe) {
  const now = new Date();
  const hours = { scalp: 4, short: 24, medium: 72, long: 168 };
  now.setHours(now.getHours() + (hours[timeframe] || 24));
  return now.toISOString();
}

function calcRiskReward(entry, target, stop) {
  if (!entry || !target || !stop) return null;
  const reward = Math.abs(target - entry);
  const risk = Math.abs(entry - stop);
  return risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (service role) and manual (authenticated user) calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      isAuthorized = !!user;
    } catch (_) {
      // Scheduled call — use service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active trading pairs
    const pairs = await base44.asServiceRole.entities.TradingPair.filter({ is_active: true });

    if (!pairs || pairs.length === 0) {
      return Response.json({ message: 'No active trading pairs found', signals_created: 0 });
    }

    // Expire old active signals first
    const oldSignals = await base44.asServiceRole.entities.Signal.filter({ status: 'active' });
    const now = new Date();
    for (const sig of oldSignals) {
      if (sig.expires_at && new Date(sig.expires_at) < now) {
        await base44.asServiceRole.entities.Signal.update(sig.id, { status: 'expired' });
      }
    }

    // Build market summary for the AI
    const marketSummary = pairs.map(p => ({
      symbol: p.symbol,
      asset_class: p.asset_class,
      current_price: p.current_price,
      price_change_24h: p.price_change_24h,
      volume_24h: p.volume_24h,
      high_24h: p.high_24h,
      low_24h: p.low_24h,
      exchange_source: p.exchange_source,
    }));

    // Ask the AI to analyze each pair
    const analysisPrompt = `
You are an expert quantitative trading analyst specializing in multi-asset markets (crypto, FX, commodities, DeFi).

Analyze the following trading pairs and identify high-probability entry signals. For EACH pair, evaluate:
1. Trend direction and momentum
2. Volatility regime (low/medium/high/extreme)
3. Market sentiment (based on price action, volume, and your knowledge of current market conditions)
4. Risk/reward setup
5. Whether entry criteria are met (only generate a signal if confidence >= ${CRITERIA.minConfidence}%)

Current market data:
${JSON.stringify(marketSummary, null, 2)}

Today's date: ${new Date().toISOString()}

For each pair where a clear signal exists (confidence >= ${CRITERIA.minConfidence}), return a signal. Skip pairs with insufficient data or low confidence.

Return a JSON object with this exact structure:
{
  "signals": [
    {
      "symbol": "BTC/USDT",
      "signal_type": "buy" | "sell" | "hold" | "watch",
      "strength": "weak" | "moderate" | "strong" | "very_strong",
      "confidence_score": 0-100,
      "entry_price": number,
      "target_price": number,
      "stop_loss": number,
      "timeframe": "scalp" | "short" | "medium" | "long",
      "sentiment": "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish",
      "volatility_level": "low" | "medium" | "high" | "extreme",
      "reasoning": "Clear concise reasoning in 2-3 sentences",
      "key_indicators": ["indicator1", "indicator2"],
      "news_catalysts": ["catalyst1"],
      "skip": false
    }
  ],
  "market_overview": "Brief overall market context in 1-2 sentences"
}

Only include pairs where entry criteria are met. Set skip=true for pairs with no clear signal.
`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          signals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                symbol: { type: "string" },
                signal_type: { type: "string" },
                strength: { type: "string" },
                confidence_score: { type: "number" },
                entry_price: { type: "number" },
                target_price: { type: "number" },
                stop_loss: { type: "number" },
                timeframe: { type: "string" },
                sentiment: { type: "string" },
                volatility_level: { type: "string" },
                reasoning: { type: "string" },
                key_indicators: { type: "array", items: { type: "string" } },
                news_catalysts: { type: "array", items: { type: "string" } },
                skip: { type: "boolean" }
              }
            }
          },
          market_overview: { type: "string" }
        }
      }
    });

    const { signals = [], market_overview } = aiResult;

    let signals_created = 0;
    const created_signals = [];

    for (const sig of signals) {
      if (sig.skip || sig.confidence_score < CRITERIA.minConfidence) continue;

      // Find matching pair for metadata
      const pair = pairs.find(p => p.symbol === sig.symbol);

      const signalData = {
        symbol: sig.symbol,
        trading_pair_id: pair?.id || null,
        asset_class: pair?.asset_class || 'crypto',
        signal_type: sig.signal_type,
        strength: sig.strength,
        confidence_score: sig.confidence_score,
        entry_price: sig.entry_price,
        target_price: sig.target_price,
        stop_loss: sig.stop_loss,
        risk_reward_ratio: calcRiskReward(sig.entry_price, sig.target_price, sig.stop_loss),
        timeframe: sig.timeframe,
        sentiment: sig.sentiment,
        volatility_level: sig.volatility_level,
        reasoning: sig.reasoning,
        key_indicators: sig.key_indicators || [],
        news_catalysts: sig.news_catalysts || [],
        status: 'active',
        expires_at: calcExpiry(sig.timeframe),
        price_at_signal: pair?.current_price || sig.entry_price,
        price_change_24h: pair?.price_change_24h || null,
        volume_24h: pair?.volume_24h || null,
      };

      const created = await base44.asServiceRole.entities.Signal.create(signalData);
      created_signals.push(created);
      signals_created++;
    }

    return Response.json({
      success: true,
      signals_created,
      market_overview: market_overview || null,
      signals: created_signals,
      pairs_analyzed: pairs.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});