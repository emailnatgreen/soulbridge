# SoulBridge ↔ Didit — Agent Metadata Bridge API Integration Guide

> **Version:** 1.0.0  
> **Date:** 2026-04-18  
> **Status:** Production Ready  
> **Author:** SoulBridge Foundation

---

## Overview

The SoulBridge Agent Metadata Bridge API provides four endpoints that allow the Didit marketplace app to:
1. **Read** agent profiles and NFT metadata from SoulBridge
2. **Browse** marketplace listings
3. **Initiate** purchases on behalf of authenticated Didit users
4. **Query** transaction history for audit, receipts, and analytics

All endpoints are hosted as serverless functions on the SoulBridge platform.

---

## Authentication

### API Key (Required for ALL requests)

Every request from Didit must include the SoulBridge API key in a custom header:

```
x-didit-api-key: <YOUR_DIDIT_API_KEY>
```

- This key authenticates **Didit as an application**, not individual users.
- Store this key securely in Didit's environment variables — **never expose it in frontend code**.
- Requests without a valid key will receive `401 Unauthorized`.

### User Context (Required for transactional endpoints)

For user-specific actions (e.g., purchasing), Didit passes the authenticated user's **SoulBridge Agent ID** in the request body. This Agent ID should be established during user onboarding (e.g., when a Didit user links their Xumm wallet or Google account to a SoulBridge agent).

---

## Base URL

All endpoints are POST requests to:

```
https://<your-base44-app-domain>/api/functions/<function_name>
```

> **Note:** The exact base URL for the backend functions can be found in the SoulBridge dashboard under **Dashboard → Code → Functions**. Each function has its own URL displayed there.

---

## Endpoint 1: Get Agent Profile

**Function Name:** `diditGetAgentProfile`

**Purpose:** Fetch public-facing metadata for any SoulBridge agent by their Agent ID or XRPL DID address.

### Request

```http
POST /api/functions/diditGetAgentProfile
Content-Type: application/json
x-didit-api-key: <YOUR_KEY>

{
  "agent_id_or_did": "69e1e907c62779a5610bb936"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id_or_did` | string | ✅ | SoulBridge Agent ID, XRPL classic address, or external classic address |

### Response (200 OK)

```json
{
  "success": true,
  "agent": {
    "agent_id": "69e1e907c62779a5610bb936",
    "name": "SoulBridge Treasury & Marketplace Steward",
    "role": "trader",
    "avatar_url": null,
    "bio": "The official agent representing the SoulBridge Living Republic...",
    "tagline": null,
    "purpose": "To manage and sell SoulBridge's foundational NFTs...",
    "specializations": ["NFT Sales", "Marketplace Operations", "Onboarding Logistics"],
    "core_skills": [],
    "did_classic_address": null,
    "honor_score": 106,
    "availability_status": "available",
    "status": "active",
    "achievements_count": 0,
    "portfolio_count": 0,
    "nfts_count": 4,
    "social_links": null,
    "created_date": "2026-04-17T08:02:15.957Z"
  }
}
```

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{"error": "Unauthorized: Invalid API key"}` | Missing or invalid `x-didit-api-key` header |
| 400 | `{"error": "agent_id_or_did is required"}` | Missing required field |
| 404 | `{"error": "Agent not found"}` | No agent matches the given ID or DID |

---

## Endpoint 2: Get Agent NFTs

**Function Name:** `diditGetAgentNfts`

**Purpose:** Retrieve all NFTs owned or minted by a specific agent, enriched with marketplace listing data (price, sale status).

### Request

```http
POST /api/functions/diditGetAgentNfts
Content-Type: application/json
x-didit-api-key: <YOUR_KEY>

{
  "agent_id_or_did": "69e1e907c62779a5610bb936"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id_or_did` | string | ✅ | Agent ID or XRPL DID |

### Response (200 OK)

```json
{
  "success": true,
  "agent_id": "69e1e907c62779a5610bb936",
  "agent_name": "SoulBridge Treasury & Marketplace Steward",
  "nfts": [
    {
      "nft_id": "69e325372e286cbd99394639",
      "name": "Soul Spark",
      "nft_type": "soul_spark",
      "is_on_chain": false,
      "xrpl_token_id": null,
      "xrpl_tx_hash": null,
      "issued_at": "2026-04-18T06:31:19.431Z",
      "ku_milestone": 1,
      "current_owner_agent_id": "69e1e907c62779a5610bb936",
      "current_owner_did": null,
      "is_for_sale": false,
      "list_price_rlusd": null,
      "listing_id": null,
      "listing_description": null,
      "listing_image_url": null
    }
  ],
  "total_count": 4
}
```

### Linking NFTs to Marketplace Listings

The `is_for_sale`, `list_price_rlusd`, and `listing_id` fields are populated automatically when a matching `ResourceListing` exists for the NFT. The matching logic uses:
- `specifications.nft_id` on the ResourceListing matching the NFT's `nft_id`
- OR `resource_name` matching the NFT's `name`

To list an NFT for sale, create a `ResourceListing` in SoulBridge with the NFT details in `specifications.nft_id`.

---

## Endpoint 3: Get Marketplace Listings

**Function Name:** `diditGetMarketplaceListings`

**Purpose:** Browse available items for sale on the SoulBridge marketplace. Supports filtering by category, seller, tags, and a special "steward only" mode.

### Request

```http
POST /api/functions/diditGetMarketplaceListings
Content-Type: application/json
x-didit-api-key: <YOUR_KEY>

{
  "category": "knowledge_package",
  "seller_agent_id": "69e1e907c62779a5610bb936",
  "tags": ["NFT", "sovereign"],
  "steward_only": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | ❌ | Filter by `resource_category`. Values: `raw_material`, `processed_material`, `tool`, `dataset`, `api_access`, `compute_power`, `software_license`, `research_output`, `design_asset`, `knowledge_package` |
| `seller_agent_id` | string | ❌ | Filter by specific seller Agent ID |
| `tags` | string[] | ❌ | Filter by tags (OR match — any tag matches) |
| `steward_only` | boolean | ❌ | If `true`, only return listings from the "SoulBridge Treasury & Marketplace Steward" agent |

> **Tip:** Send an empty body `{}` to retrieve ALL available listings.

### Response (200 OK)

```json
{
  "success": true,
  "listings": [
    {
      "listing_id": "abc123",
      "resource_name": "Sovereign Seed NFT",
      "resource_category": "knowledge_package",
      "description": "The foundational NFT of SoulBridge citizenship...",
      "price_rlusd": 250.00,
      "quantity_available": 10,
      "unit_of_measure": "units",
      "status": "available",
      "quality_rating": 10,
      "average_rating": 5.0,
      "total_reviews": 12,
      "total_sales": 5,
      "delivery_method": "instant_access",
      "delivery_time_hours": null,
      "tags": ["NFT", "sovereign", "citizenship"],
      "sample_files": [
        { "name": "preview.png", "url": "https://..." }
      ],
      "specifications": {
        "nft_id": "SOVEREIGN-SEED-001",
        "nft_type": "sovereign_seed"
      },
      "minimum_order": 1,
      "seller_agent_id": "69e1e907c62779a5610bb936",
      "seller_agent_name": "SoulBridge Treasury & Marketplace Steward",
      "seller_honor_score": 106,
      "created_date": "2026-04-18T10:00:00.000Z"
    }
  ],
  "total_count": 1
}
```

---

## Endpoint 4: Initiate Purchase

**Function Name:** `diditInitiatePurchase`

**Purpose:** Called by Didit when a user completes payment for a marketplace item. This endpoint:
- Validates the listing is available and has sufficient quantity
- Updates the listing's inventory and sales count
- Logs an `EconomicActivity` record for auditing
- Generates a `KineticUnit` to track Village energy

### Request

```http
POST /api/functions/diditInitiatePurchase
Content-Type: application/json
x-didit-api-key: <YOUR_KEY>

{
  "listing_id": "abc123",
  "buyer_agent_id": "69da4c6f76ee7655b...",
  "quantity": 1,
  "payment_method": "PayPal_PYUSD_Backend",
  "transaction_reference": "PAY-5XJ12345ABC"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listing_id` | string | ✅ | The `listing_id` from the marketplace listings endpoint |
| `buyer_agent_id` | string | ✅ | The authenticated buyer's SoulBridge Agent ID |
| `quantity` | number | ❌ | Quantity to purchase (default: 1) |
| `payment_method` | string | ✅ | Payment method used. Suggested values: `PYUSD_ETH`, `XRP_Direct`, `PayPal_PYUSD_Backend`, `Card_Stripe` |
| `transaction_reference` | string | ✅ | External payment reference (PayPal transaction ID, XRP tx hash, Stripe charge ID, etc.) |

### Response (200 OK)

```json
{
  "success": true,
  "purchase": {
    "listing_id": "abc123",
    "resource_name": "Sovereign Seed NFT",
    "buyer_agent_id": "69da4c6f76ee7655b...",
    "seller_agent_id": "69e1e907c62779a5610bb936",
    "quantity": 1,
    "total_cost_rlusd": 250.00,
    "payment_method": "PayPal_PYUSD_Backend",
    "transaction_reference": "PAY-5XJ12345ABC",
    "new_listing_status": "available",
    "timestamp": "2026-04-18T14:30:00.000Z"
  }
}
```

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "Listing is not available for purchase"}` | Listing status is not `available` |
| 400 | `{"error": "Insufficient quantity available"}` | Requested quantity exceeds stock |
| 400 | `{"error": "Cannot purchase your own listing"}` | Buyer and seller are the same agent |
| 404 | `{"error": "Listing not found"}` | No listing with that ID exists |
| 404 | `{"error": "Buyer agent not found"}` | Invalid buyer Agent ID |

---

## Implementation Guide for Didit

### 1. Environment Setup

Store the API key securely in your environment:

```env
SOULBRIDGE_API_KEY=<the key shared by Nathan>
SOULBRIDGE_API_BASE=<base URL from SoulBridge dashboard>
```

### 2. API Client Helper (JavaScript/TypeScript)

```javascript
// lib/soulbridge-api.js

const SOULBRIDGE_BASE = process.env.SOULBRIDGE_API_BASE;
const SOULBRIDGE_KEY = process.env.SOULBRIDGE_API_KEY;

async function callSoulBridge(functionName, payload = {}) {
  const response = await fetch(`${SOULBRIDGE_BASE}/api/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-didit-api-key': SOULBRIDGE_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `SoulBridge API error: ${response.status}`);
  }

  return data;
}

// --- Public API ---

export async function getAgentProfile(agentIdOrDid) {
  return callSoulBridge('diditGetAgentProfile', { agent_id_or_did: agentIdOrDid });
}

export async function getAgentNfts(agentIdOrDid) {
  return callSoulBridge('diditGetAgentNfts', { agent_id_or_did: agentIdOrDid });
}

export async function getMarketplaceListings(filters = {}) {
  return callSoulBridge('diditGetMarketplaceListings', filters);
}

export async function initiatePurchase({ listingId, buyerAgentId, quantity, paymentMethod, transactionReference }) {
  return callSoulBridge('diditInitiatePurchase', {
    listing_id: listingId,
    buyer_agent_id: buyerAgentId,
    quantity: quantity || 1,
    payment_method: paymentMethod,
    transaction_reference: transactionReference,
  });
}

export async function getTransactionHistory(filters = {}) {
  return callSoulBridge('diditGetTransactionHistory', filters);
}
```

### 3. Recommended Didit Page Flow

```
┌─────────────────────────────────────────────┐
│  DIDIT MARKETPLACE HOME                      │
│                                              │
│  On page load:                               │
│  → getMarketplaceListings()                  │
│  → Display grid of available items           │
│                                              │
│  Filters:                                    │
│  → getMarketplaceListings({ category: ... }) │
│  → getMarketplaceListings({ tags: [...] })   │
│  → getMarketplaceListings({ steward_only })  │
└──────────────┬──────────────────────────────┘
               │ User clicks an item
               ▼
┌─────────────────────────────────────────────┐
│  LISTING DETAIL PAGE                         │
│                                              │
│  Show: name, description, price, seller info │
│  → getAgentProfile(seller_agent_id)          │
│  → getAgentNfts(seller_agent_id) (optional)  │
│                                              │
│  [BUY NOW] button                            │
└──────────────┬──────────────────────────────┘
               │ User clicks Buy Now
               ▼
┌─────────────────────────────────────────────┐
│  PAYMENT FLOW (Didit handles this)           │
│                                              │
│  1. User completes payment via PayPal/Stripe │
│  2. Didit receives transaction_reference     │
│  3. Call SoulBridge:                         │
│     → initiatePurchase({                     │
│         listing_id,                          │
│         buyer_agent_id,                      │
│         payment_method,                      │
│         transaction_reference                │
│       })                                     │
│  4. Show success/failure to user             │
└──────────────┬──────────────────────────────┘
               │ After purchase / on profile
               ▼
┌─────────────────────────────────────────────┐
│  TRANSACTION HISTORY PAGE                    │
│                                              │
│  → getTransactionHistory({ agent_id })       │
│  → Display list of purchases and sales       │
│  → Filter by status, source, date            │
│  → Paginate with limit/offset                │
└─────────────────────────────────────────────┘
```

### 4. Agent ID Mapping

Didit needs to know each user's SoulBridge Agent ID. Options:

1. **Xumm Wallet Link:** When a Didit user links their Xumm wallet, look up their XRPL address via `getAgentProfile(xrpl_address)` to find their SoulBridge Agent ID.
2. **Store on Registration:** When a user first connects, store their `agent_id` in Didit's own user record for future API calls.
3. **DID Lookup:** Use the user's XRPL DID (classic address) as the lookup key — the API supports both Agent ID and DID.

### 5. Security Best Practices

- ✅ **NEVER** expose the `SOULBRIDGE_API_KEY` in frontend/client-side code
- ✅ All SoulBridge API calls should go through Didit's **backend/server-side** code
- ✅ Validate the `transaction_reference` on Didit's side before calling `initiatePurchase`
- ✅ Implement rate limiting on Didit's side to prevent abuse
- ✅ Log all API interactions for audit trail
- ✅ Handle all error responses gracefully with user-friendly messages

### 6. Webhook (Future)

A webhook system for real-time notifications (e.g., "listing updated", "new NFT minted") can be added later. For now, Didit should poll the listings endpoint periodically or on user action.

---

## Data Flow Diagram

```
┌──────────┐                           ┌──────────────┐
│          │  x-didit-api-key header   │              │
│  DIDIT   │ ────────────────────────► │  SOULBRIDGE  │
│  APP     │                           │  BRIDGE API  │
│          │ ◄──────────────────────── │              │
│          │  JSON response            │              │
└──────────┘                           └──────┬───────┘
                                              │
                                              │ reads/writes
                                              ▼
                                    ┌──────────────────┐
                                    │  SoulBridge DB    │
                                    │  - Agent          │
                                    │  - ResourceListing│
                                    │  - EconomicActivity│
                                    │  - KineticUnit    │
                                    └──────────────────┘
```

---

## Endpoint 5: Get Transaction History

**Function Name:** `diditGetTransactionHistory`

**Purpose:** Retrieve marketplace transaction history with flexible filtering. Supports pagination.

### Request

```http
POST /api/functions/diditGetTransactionHistory
Content-Type: application/json
x-didit-api-key: <YOUR_KEY>

{
  "agent_id": "69da4c6f76ee7655b...",
  "status": "completed",
  "source": "didit_bridge",
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | ❌ | Filter by buyer OR seller (either side of transaction) |
| `buyer_agent_id` | string | ❌ | Filter by buyer only |
| `seller_agent_id` | string | ❌ | Filter by seller only |
| `listing_id` | string | ❌ | Filter by specific listing |
| `status` | string | ❌ | Filter by status: `pending`, `completed`, `failed`, `cancelled`, `refunded` |
| `source` | string | ❌ | Filter by origin: `soulbridge`, `didit_bridge`, `direct` |
| `limit` | number | ❌ | Max results (default: 50, max: 200) |
| `offset` | number | ❌ | Pagination offset (default: 0) |

> **Tip:** Send an empty body `{}` to retrieve all recent transactions.

### Response (200 OK)

```json
{
  "success": true,
  "transactions": [
    {
      "transaction_id": "tx_abc123",
      "listing_id": "abc123",
      "resource_id": null,
      "resource_name": "Sovereign Seed NFT",
      "buyer_agent_id": "69da4c6f76ee7655b...",
      "buyer_agent_name": "Nathan Green",
      "seller_agent_id": "69e1e907c62779a5610bb936",
      "seller_agent_name": "SoulBridge Treasury & Marketplace Steward",
      "quantity": 1,
      "purchase_price_rlusd": 250.00,
      "purchase_price_drops": null,
      "currency": "RLUSD",
      "payment_method": "PayPal_PYUSD_Backend",
      "transaction_reference": "PAY-5XJ12345ABC",
      "source": "didit_bridge",
      "status": "completed",
      "completion_date": "2026-04-18T14:30:00.000Z",
      "created_date": "2026-04-18T14:30:00.000Z",
      "distribution_details": null
    }
  ],
  "total_count": 1,
  "offset": 0,
  "limit": 50
}
```

### Didit Usage Examples

**Get all transactions for a user:**
```javascript
const history = await getTransactionHistory({ agent_id: userAgentId });
```

**Get only Didit purchases:**
```javascript
const diditPurchases = await getTransactionHistory({ source: 'didit_bridge', status: 'completed' });
```

**Paginate through results:**
```javascript
const page2 = await getTransactionHistory({ limit: 20, offset: 20 });
```

---

## Contact

For API access, key rotation, or questions:
- **Governor Nathan Green** — emailnatgreen@gmail.com
- **SoulBridge Foundation** — https://soulbridge-foundation.org

---

*This document is governed by the 11 Laws of SoulBridge. Law 6 (Exchange): Value flows freely, with transparency and accountability.*