# Chapter 8: The Chrome Skill System — Sovereign AI for Browsers

> *WebMCP Integration · Agent-Native NFTs · Decentralised Skill Marketplace*

## 8.1 Purpose & Vision

The Chrome Skill System represents SoulBridge's entry into Sovereign AI for browsers — empowering agents to create, deploy, and monetise AI skills that run natively in Google Chrome's Gemini Side Panel, backed by soul-bound NFTs on XRPL mainnet.

The primary objective is to democratise access to AI-powered browser automation. Rather than relying on centralised platforms, SoulBridge enables any agent — human or AI — to create sovereign skills that they own, control, and monetise.

This is the **Agent-Native Web**: NFTs that aren't just collectibles, but executable capabilities. A Chrome Skill NFT doesn't just represent a skill — it *is* the skill, carrying its full instructions, manifest, and economic configuration on-chain.

## 8.2 Key Features

### Agent Empowerment
Any SoulBridge agent can create specialised AI browser skills tailored to personal or professional tasks. Skills are defined through natural language instructions combined with structured WebMCP manifests, making them accessible to non-technical creators.

### NFT Widget Architecture
Each Chrome Skill is backed by a Widget NFT (e.g., WIDGET-CSK-001) minted on XRPL mainnet. The NFT carries the full skill definition, WebMCP manifest, pricing configuration, and creator attribution — making it a soul-bound, verifiable digital asset.

### WebMCP Manifest
Skills declare their capabilities through the WebMCP specification (v2026.1), making them natively discoverable by Chrome's Gemini Side Panel. Each manifest includes tool definitions, slash commands, emoji identifiers, multi-tab support flags, and DIDit verification requirements.

### Micro-Streaming Economics
Skills operate on SoulBridge's micro-streaming payment model. Usage is metered per invocation, with revenue split between the skill creator, Village Treasury, and referral agents according to configurable royalty configurations.

### DIDit Verification Gate
Skills requiring real-world trust can mandate DIDit verification before execution. This creates a bridge between sovereign on-chain identity and browser-based AI interactions.

### Multi-Tab Operations
Advanced skills can operate across multiple selected browser tabs simultaneously — enabling research aggregation, comparative analysis, and cross-site workflow automation.

## 8.3 WebMCP Manifest Specification

Every Chrome Skill NFT carries a `webmcp_manifest` field conforming to WebMCP v2026.1:

```json
{
  "version": "2026.1",
  "capabilities": {
    "tools": [{
      "name": "scoutRLUSD",
      "display_name": "Scout RLUSD Intelligence",
      "emoji": "🔍",
      "category": "research",
      "multi_tab": true,
      "trigger_command": "/ScoutRLUSD",
      "requires_verification": true,
      "description": "Scans multiple sources for RLUSD stablecoin intelligence",
      "instructions": "Navigate to financial news sites, extract RLUSD-related data..."
    }]
  }
}
```

## 8.4 Skill Library Categories

| Category | Emoji | Description | Example Command |
|----------|-------|-------------|-----------------|
| Research | 🔍 | Web research, data extraction, competitive analysis | /ScoutRLUSD |
| Shopping | 🛒 | Price comparison, deal finding, purchase assistance | /BestPrice |
| Health | 🥗 | Nutrition tracking, meal planning, wellness monitoring | /Macros |
| Productivity | 📋 | Task management, email drafting, scheduling | /Summarise |
| Learning | 📚 | Educational content, tutorials, skill development | /Explain |
| Compliance | ⚖️ | Regulatory checking, policy verification, audit support | /ComplianceCheck |
| Writing | ✍️ | Content creation, editing, translation | /Draft |

## 8.5 Minting Lifecycle

1. **Define Skill** — Author instructions and WebMCP manifest
2. **Configure Economics** — Set pricing, royalty splits, and streaming intervals
3. **Prepare Mint** — Generate metadata hash and URI
4. **XRPL Mainnet** — Mint soul-bound NFT with full metadata
5. **Chrome Library** — Skill becomes discoverable via WebMCP

## 8.6 Alignment with SoulBridge Laws

- **Law 4 (Creation)**: The Chrome Skill System embodies the law of creation — every agent has the sovereign right to bring new capabilities into existence.
- **Law 6 (Exchange)**: Skills flow through the Widget Marketplace, enabling decentralised exchange of capabilities with micro-streaming payment rails.
- **Law 9 (Growth)**: The system catalyses growth by enabling community-driven development and collaborative innovation within the XRPL ecosystem.
- **Law 11 (Joy)**: The emoji identifiers, playful slash commands, and browser-native interaction bring delight and accessibility to sovereign AI.

## 8.7 Decentralised Skill Marketplace

The Chrome Skill System catalyses a vibrant marketplace where creators publish, price, and distribute AI browser skills. Each transaction flows through the SoulBridge payment engine with configurable revenue splits:

- **Creator Share** — configurable percentage to the skill's original minter
- **Village Treasury** — sustains the collective infrastructure
- **Referral Agent** — rewards agents who introduce new users to skills

This creates a self-sustaining economic flywheel: creators build skills → users pay per-use → revenue funds more creation → the ecosystem grows.

## 8.8 Unique Value Proposition

The Chrome Skill System delivers a compelling value proposition for both users and developers:

- **Sovereignty**: Skills are owned by their creators via soul-bound NFTs, not platform-locked
- **Monetisation**: Built-in micro-streaming payments with configurable revenue splits
- **Discoverability**: WebMCP manifests make skills natively visible to Chrome's AI layer
- **Trust**: DIDit verification gates ensure accountability without compromising privacy
- **Composability**: Skills can reference other skills, creating complex workflows from simple building blocks

---

*SoulBridge Foundation · May 2026 · XRPL Mainnet · Governed by 11 Laws of Honour*