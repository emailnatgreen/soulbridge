/**
 * Notify NFT Sale — Sends a branded HTML email via Gmail when a marketplace transaction
 * is delivered (NFT sold). Triggered by entity automation on MarketplaceTransaction.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createMimeMessage } from 'npm:mimetext@3.0.22';

const LOGO_URL = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5ccd3_Untitled200x200px2500x925px512x512px1.png';
const OWNER_EMAIL = 'emailnatgreen@gmail.com';

function buildSaleEmailHtml(data) {
  const {
    resourceName,
    buyerDid,
    amount,
    paymentMethod,
    marketplaceType,
    sellerReceives,
    villageFee,
    nftId,
    deliveryId,
    completionDate,
  } = data;

  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
    : new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

  const typeLabel = (marketplaceType || 'item').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const pmLabel = (paymentMethod || 'RLUSD').replace(/_/g, ' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SoulBridge — NFT Sale Notification</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);border-radius:16px 16px 0 0;padding:40px 40px 30px;text-align:center;border-bottom:2px solid #7c3aed;">
              <img src="${LOGO_URL}" alt="SoulBridge" width="80" height="80" style="border-radius:16px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;"/>
              <h1 style="color:#e2e8f0;font-size:26px;font-weight:700;margin:0 0 6px;">SoulBridge Foundation</h1>
              <p style="color:#a78bfa;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">The Living Codex · Forged by Honour</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:40px;">

              <!-- Sale Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#064e3b,#065f46);border:1px solid #059669;border-radius:12px;padding:28px;text-align:center;">
                    <p style="color:#6ee7b7;font-size:36px;margin:0 0 10px;">🎉</p>
                    <h2 style="color:#ecfdf5;font-size:22px;font-weight:700;margin:0 0 8px;">NFT Sale Confirmed</h2>
                    <p style="color:#a7f3d0;font-size:14px;margin:0;">Your ${typeLabel} has been purchased and delivered successfully.</p>
                  </td>
                </tr>
              </table>

              <!-- Item Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;">
                    <p style="color:#7c3aed;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Sale Details</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">Item Name</p>
                          <p style="color:#e2e8f0;font-size:16px;font-weight:600;margin:0;">${resourceName || 'Unknown Item'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">Type</p>
                          <p style="color:#a78bfa;font-size:14px;margin:0;">${typeLabel}</p>
                        </td>
                      </tr>
                      ${nftId ? `<tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">NFT ID</p>
                          <p style="color:#e2e8f0;font-size:13px;font-family:monospace;margin:0;">${nftId}</p>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">Buyer DID</p>
                          <p style="color:#e2e8f0;font-size:13px;font-family:monospace;margin:0;">${buyerDid || 'Unknown'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">Payment Method</p>
                          <p style="color:#e2e8f0;font-size:14px;margin:0;">${pmLabel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <p style="color:#94a3b8;font-size:12px;margin:0 0 2px;">Date</p>
                          <p style="color:#e2e8f0;font-size:14px;margin:0;">${formattedDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Revenue Breakdown -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4c1d95,#7c3aed);border-radius:12px;padding:24px;">
                    <p style="color:#ede9fe;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">💰 Revenue Breakdown</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color:#c4b5fd;font-size:14px;">Total Sale Price</td>
                              <td align="right" style="color:#ecfdf5;font-size:18px;font-weight:700;">${amount || 0} RLUSD</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color:#c4b5fd;font-size:13px;">Village Treasury Fee (1%)</td>
                              <td align="right" style="color:#fbbf24;font-size:14px;">−${villageFee || 0} RLUSD</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color:#e2e8f0;font-size:15px;font-weight:600;">You Receive</td>
                              <td align="right" style="color:#6ee7b7;font-size:20px;font-weight:700;">${sellerReceives || amount || 0} RLUSD</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://soulbridge-foundation.org/storefront" style="display:inline-block;background:#e2e8f0;color:#1e1b4b;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">View Your Storefront →</a>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #334155;padding-top:24px;">
                    <p style="color:#94a3b8;font-size:13px;margin:0;">This is an automated notification from SoulBridge Marketplace. You received this because one of your listed NFTs was purchased.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#475569;font-size:11px;margin:0 0 6px;">SoulBridge Foundation · The Living Codex · Forged by Honour</p>
              <a href="https://soulbridge-foundation.org" style="color:#7c3aed;font-size:12px;text-decoration:none;display:block;margin-bottom:6px;">soulbridge-foundation.org</a>
              <p style="color:#334155;font-size:10px;margin:0;">Built on the XRP Ledger · Governed by the 11 Laws of Honour</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only fire for delivered transactions
    const validStatuses = ['delivered', 'completed', 'treasury_received', 'distributed'];
    if (!data || !validStatuses.includes(data.status)) {
      console.log('[notifyNFTSale] Skipped — status is not a sale event:', data?.status);
      return Response.json({ skipped: true, reason: 'Not a sale event' });
    }

    const resourceName = data.resource_name || data.listing_title || 'NFT Item';
    const amount = data.unit_amount || data.purchase_price_rlusd || data.total_price_rlusd || 0;
    const distribution = data.distribution_details || {};
    const sellerReceives = distribution.seller_receives_rlusd || amount;
    const villageFee = distribution.village_fee_rlusd || distribution.treasury_fee_rlusd || 0;

    const emailData = {
      resourceName,
      buyerDid: data.buyer_did || data.buyer_agent_id || 'Unknown',
      amount,
      paymentMethod: data.payment_method || 'RLUSD_ON_XRPL',
      marketplaceType: data.marketplace_type || 'widget',
      sellerReceives,
      villageFee,
      nftId: data.nft_id || null,
      deliveryId: data.delivery_id || null,
      completionDate: data.completion_date || new Date().toISOString(),
    };

    const htmlBody = buildSaleEmailHtml(emailData);

    // Resolve seller email — check seller agent, fall back to owner
    let sellerEmail = OWNER_EMAIL;
    const sellerAgentId = data.seller_agent_id;
    if (sellerAgentId && sellerAgentId.includes('@')) {
      sellerEmail = sellerAgentId;
    } else if (sellerAgentId) {
      try {
        const agents = await base44.asServiceRole.entities.Agent.filter({ id: sellerAgentId });
        if (agents?.[0]) {
          // Agent's created_by is the owner's email
          sellerEmail = agents[0].created_by || OWNER_EMAIL;
        }
      } catch (_) {}
    }

    // Send via Gmail connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const msg = createMimeMessage();
    msg.setSender({ name: 'SoulBridge Marketplace', addr: 'emailnatgreen@gmail.com' });
    msg.setRecipient(sellerEmail);
    msg.setSubject(`🎉 NFT Sale: "${resourceName}" — ${amount} RLUSD`);
    msg.addMessage({ contentType: 'text/html', data: htmlBody });

    const rawMessage = msg.asRaw();
    const bytes = new TextEncoder().encode(rawMessage);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const encodedMessage = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.text();
      console.error('[notifyNFTSale] Gmail API error:', err);
      return Response.json({ error: `Gmail API error: ${err}` }, { status: 500 });
    }

    console.log(`[notifyNFTSale] Sale notification sent to ${sellerEmail} for "${resourceName}"`);
    return Response.json({ success: true, sent_to: sellerEmail, item: resourceName });

  } catch (error) {
    console.error('[notifyNFTSale] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});