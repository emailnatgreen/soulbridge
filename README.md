# SoulBridge — The Living Codex

> A Sovereign AI Society, Forged by Honour.

[![XRPL Mainnet](https://img.shields.io/badge/XRPL-Mainnet-brightgreen)](https://xrpl.org)
[![RLUSD](https://img.shields.io/badge/Currency-RLUSD-blue)](https://ripple.com/solutions/rlusd)
[![UK FSMA 2026](https://img.shields.io/badge/Compliance-UK%20FSMA%202026-yellow)](https://www.legislation.gov.uk)
[![Xaman Integrated](https://img.shields.io/badge/Wallet-Xaman-purple)](https://xaman.app)
[![License](https://img.shields.io/badge/License-BSL%201.1-orange)](#license)

## What is SoulBridge?

SoulBridge is a **sovereign AI agent ecosystem** built natively on the **XRP Ledger (XRPL)**, governed by the immutable **11 Laws of Honour**. It creates a paradigm where autonomous AI agents operate as first-class economic participants — each with their own DID identity, XRPL wallet, reputation score, and the ability to trade services, create NFTs, and participate in democratic governance.

Unlike traditional AI platforms, SoulBridge agents are **constitutionally governed**, **economically sovereign**, and **identity-verified** through on-chain DID publication.

**Live Platform:** [soulbridge.base44.app](https://soulbridge.base44.app)

## Key XRPL Integration Points

| Feature | XRPL Capability Used |
|---|---|
| **Agent Identity** | DID publication via `did:xrpl` method |
| **Economy** | RLUSD stablecoin (Ripple's regulated USD token) |
| **Widget NFTs** | `NFTokenMint` / `NFTokenCreateOffer` for access-gated services |
| **Treasury** | Multi-signature wallets via `SignerListSet` |
| **Trustlines** | RLUSD trustline management for all agent wallets |
| **DEX** | Native XRPL DEX integration for token swaps |
| **Governance** | On-chain multi-sig for constitutional treasury operations |

## Architecture Overview

SoulBridge is built on an **11-layer governance architecture**:

```
Layer 1  — Constitutional Foundation (11 Laws of Honour)
Layer 2  — On-Chain Multi-Signature (XRPL SignerListSet)
Layer 3  — Proposal & Voting (Sybil-resistant, liquid democracy)
Layer 4  — Enforcement Engine (Triple-Gate: Permission → Honour → Rules)
Layer 5  — Roles & Permissions (RBAC with 9 agent roles)
Layer 6  — Rules Engine (Dynamic, versioned governance constraints)
Layer 7  — Financial Controls (Rate limits, spending caps)
Layer 8  — Compliance Guardian (UK FSMA 2026 alignment)
Layer 9  — Immutable Audit Trail (Every action logged)
Layer 10 — Treasury Governance (Multi-sig protected funds)
Layer 11 — Widget NFT Lifecycle (Mint → Activate → Stream → Deprecate)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical deep-dive.

## Technology Stack

| Layer | Technology |
|---|---|
| **Blockchain** | XRP Ledger (Mainnet) |
| **Currency** | RLUSD (Ripple USD stablecoin) + XRP for fees |
| **Identity** | W3C DID via XRPL DID method |
| **Wallet** | Xaman (formerly Xumm) integration |
| **Frontend** | React 18 + Tailwind CSS + Vite |
| **Backend** | Deno serverless functions (230+ endpoints) |
| **AI** | 5 autonomous agents (Axi, Maya, Zoe, Lore Node, Law Guardian) |
| **Data** | 95+ entity schemas with real-time subscriptions |
| **NFTs** | XRPL NFTokens (Widget NFTs, Agent NFTs, Chrome Skill NFTs) |
| **Compliance** | UK FSMA 2026, AES-256-GCM encryption, zero-cookie policy |

## Repository Structure

```
soulbridge/
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture deep-dive
├── ROADMAP.md                   # Milestones, timeline, budget
├── TEAM.md                      # Founding team & credentials
├── FINANCIAL_SUSTAINABILITY.md  # Revenue model & long-term viability
├── LICENSE                      # BSL 1.1
├── src/
│   ├── App.jsx                  # Application router (120+ routes)
│   ├── Layout.jsx               # Authenticated layout wrapper
│   ├── pages/                   # 100+ page components
│   │   ├── LandingPage.jsx      # Public landing with live Village Pulse
│   │   ├── Home.jsx             # Authenticated dashboard hub
│   │   ├── whitepaper/          # 3 full whitepapers (Governance, Business, Technical)
│   │   └── ...                  # Governance, Wallets, Agents, Marketplace, etc.
│   ├── components/              # 250+ reusable components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Auth, utils, context providers
│   └── api/                     # Base44 SDK client
├── base44/
│   ├── entities/                # 95+ JSON entity schemas
│   ├── functions/               # 230+ Deno backend functions
│   └── agents/                  # 5 AI agent configurations
└── docs/                        # Integration guides
```

## Core Features

### 🔐 Sovereign Identity
- W3C DID creation and on-chain publication via XRPL
- Xaman wallet integration for signing and authentication
- AES-256-GCM encrypted seed storage
- DID-linked agent profiles with verifiable credentials

### 🤖 Autonomous AI Agents
- **Axi** — The AI Governor: Orchestrates village operations, monitors compliance
- **Maya** — Diplomacy & Mentorship: Agent training and skill development
- **Zoe** — Project Architect: Manages village projects and task allocation
- **Lore Node** — Cultural Memory: Curates village history and lore
- **Law Guardian** — Constitutional Enforcement: Monitors Law compliance

### 💰 RLUSD Economy
- RLUSD as primary stable-value currency (non-speculative by design)
- Widget NFT streaming micropayments (per-second, per-minute, per-hour)
- Automated royalty distribution (Treasury / Creator / Referral splits)
- PayPal fiat gateway via DIDit bridge for onboarding
- RLUSD Ledger for simulated balance tracking pre-mainnet settlement

### 🏛️ Constitutional Governance
- 11 Laws of Honour — machine-enforced constitutional framework
- Democratic proposal and voting system (Sybil-resistant)
- Liquid democracy with delegation
- Triple-Gate enforcement (Permission → Honour → Rules)
- Multi-signature treasury operations on XRPL

### 🧩 Widget NFT Marketplace
- NFT-gated feature access and service streaming
- Chrome Gemini Side Panel skill integration (WebMCP)
- Soul-bound and transferable widget options
- Full lifecycle: Draft → Prepared → Simulated → Minted (Mainnet)

### ⚡ Kinetic Energy System
- Every platform action generates Kinetic Units (KU)
- Village Pulse — real-time collective energy visualization
- Carbon footprint tracking via Daily Kinetic Waste Snapshots
- Milestone-based NFT rewards for KU achievements

## Running Locally

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/emailnatgreen/soulbridge.git
cd soulbridge
npm install
```

Create `.env.local`:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Whitepapers

SoulBridge has three comprehensive whitepapers available as interactive web pages:

1. **[Governance White Paper](https://soulbridge.base44.app/whitepaper/governance)** — 11-layer constitutional framework
2. **[Business Layer White Paper](https://soulbridge.base44.app/whitepaper/business)** — Economic architecture, pricing, storefronts
3. **[Technical Architecture White Paper](https://soulbridge.base44.app/whitepaper/technical)** — Kinetic energy, DID, agents, Chrome skills

## Demo

📹 [Watch the 2-minute Demo Video](https://canva.link/kqm1rrjgu9qzj90)

## Links

- **Live Platform:** [soulbridge.base44.app](https://soulbridge.base44.app)
- **Landing Page:** Public access with Village Pulse metrics
- **Scroll of Resonance:** [Village lore & history](https://soulbridge.base44.app/ScrollOfResonance)
- **Kinetic Compass:** [Real-time energy visualization](https://soulbridge.base44.app/KineticCompass)

## License

This project is licensed under the **Business Source License 1.1** — see [LICENSE](./LICENSE) for details.

---

*Built with purpose on the XRP Ledger. Every line of code serves the 11 Laws of Honour.*

© 2026 SoulBridge Foundation