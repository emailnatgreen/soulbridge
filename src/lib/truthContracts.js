/**
 * ═══════════════════════════════════════════════════════════════
 *  CANONICAL CONTRACTS — Truth Engine
 *  Single source of truth. Any change = new version.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── TruthReportV1 ───────────────────────────────────────────
export const TRUTH_REPORT_SCHEMA = {
  name: 'TruthReportV1',
  version: '1.0.0',
  hash_algo: 'sha256',
  engine: {
    name: 'SoulBridge Truth Engine',
    version: '1.0.0',
  },
};

// ─── TruthPolicyV1 ───────────────────────────────────────────
// Frozen ruleset. To change thresholds → create TruthPolicyV2.
export const TRUTH_POLICY_V1 = {
  name: 'TruthPolicyV1',
  version: '1.0.0',
  rules: {
    block: {
      condition: 'avg_score < 0.4',
      description: 'Average veracity below 40% — block output',
    },
    flag: {
      condition: 'avg_score < 0.7 OR any claim < 0.6',
      description: 'Below threshold — manual review recommended',
    },
    allow: {
      condition: 'avg_score >= 0.7 AND all claims >= 0.6',
      description: 'All claims meet confidence threshold',
    },
  },
  thresholds: {
    block_avg: 0.4,
    flag_avg: 0.7,
    flag_min_claim: 0.6,
  },
};

// ─── ResearchNFTMetadataV1 ───────────────────────────────────
// Frozen shape. NFT minters must produce exactly this structure.
export const RESEARCH_NFT_METADATA_SCHEMA = {
  name: 'ResearchNFTMetadataV1',
  version: '1.0.0',
  shape: {
    name: 'string',
    description: 'string',
    question: 'string',
    report_id: 'string',
    report_hash: 'string',
    schema: 'TruthReportV1',
    created_at: 'string (ISO 8601)',
    veracity: {
      avg_score: 'number (0-1)',
      min_score: 'number (0-1)',
      max_score: 'number (0-1)',
      claims_count: 'number',
    },
    engine: {
      name: 'SoulBridge Truth Engine',
      version: '1.0.0',
    },
  },
};

// ─── Node 3 Outbox Payload Shape ─────────────────────────────
export const NODE3_OUTBOX_SHAPE = {
  report_id: 'string',
  schema: 'TruthReportV1',
  hash_algo: 'sha256',
  hash: 'string',
  veracity_summary: {
    avg_score: 'number',
    min_score: 'number',
    max_score: 'number',
    claims_count: 'number',
  },
  created_at: 'string (ISO 8601)',
};