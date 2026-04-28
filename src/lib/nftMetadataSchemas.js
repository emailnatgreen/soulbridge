/**
 * SoulBridge NFT Metadata Standard v3.0.0
 * 
 * Defines the unified metadata schema with type-specific `custom_data` sub-schemas.
 * Each NFT type (widget, chrome_skill, agent) has:
 *   - common fields (shared across all types)
 *   - custom_data schema (type-specific structured data)
 *   - defaults (schema-level defaults applied before validation)
 */

export const METADATA_STANDARD_VERSION = '3.0.0';

// ── Common fields shared across ALL NFT types ────────────────────────────────
export const COMMON_FIELDS = {
  name: { type: 'string', required: true, maxLength: 100, label: 'Name' },
  description: { type: 'string', required: true, maxLength: 2000, label: 'Description' },
  nft_id: { type: 'string', pattern: /^WIDGET-[A-Z]{2,4}-\d{3,6}$/, label: 'Widget NFT ID' },
  image_url: { type: 'string', label: 'Image URL' },
  version: { type: 'string', default: '1.0.0', pattern: /^\d+\.\d+\.\d+$/, label: 'Version' },
  taxon: { type: 'number', default: 0, min: 0, label: 'Taxon' },
  transfer_fee: { type: 'number', default: 0, min: 0, max: 50000, label: 'Transfer Fee' },
  transferable: { type: 'boolean', default: false, label: 'Transferable' },
  burnable: { type: 'boolean', default: false, label: 'Burnable' },
};

// ── Widget NFT custom_data schema ────────────────────────────────────────────
export const WIDGET_CUSTOM_DATA_SCHEMA = {
  type: 'object',
  label: 'Widget Configuration',
  description: 'Type-specific metadata for Widget NFTs',
  properties: {
    category: {
      type: 'string',
      enum: ['agent_creation', 'skill', 'environment', 'governance', 'training', 'wallet_management', 'did_management', 'other'],
      default: 'other',
      label: 'Category',
    },
    widget_type: {
      type: 'string',
      enum: ['unlock', 'service'],
      default: 'unlock',
      label: 'Widget Type',
    },
    ui_behavior: {
      type: 'string',
      enum: ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'],
      default: 'unlock_page',
      label: 'UI Behavior',
    },
    feature_path: {
      type: 'string',
      label: 'Feature Path',
      description: 'Route this widget unlocks (e.g. /my-feature)',
    },
    pricing: {
      type: 'object',
      label: 'Pricing',
      properties: {
        service_price_rlusd: { type: 'number', default: 0, label: 'Service Price (RLUSD)' },
        stream_cost_rlusd: { type: 'number', default: 0, label: 'Stream Cost (RLUSD)' },
        stream_interval: {
          type: 'string',
          enum: ['second', 'minute', 'hour', 'day'],
          default: 'hour',
          label: 'Stream Interval',
        },
      },
    },
  },
};

// ── Chrome Skill NFT custom_data schema ──────────────────────────────────────
export const CHROME_SKILL_CUSTOM_DATA_SCHEMA = {
  type: 'object',
  label: 'Chrome Skill Configuration',
  description: 'Chrome Gemini Side Panel skill definitions',
  properties: {
    skills: {
      type: 'array',
      label: 'Skill Definitions',
      items: {
        type: 'object',
        properties: {
          skill_name: { type: 'string', required: true, label: 'Skill Name' },
          trigger_command: { type: 'string', label: 'Trigger Command' },
          instructions: { type: 'string', required: true, label: 'Instructions' },
          requires_didit_verification: { type: 'boolean', default: true, label: 'Require DIDit Verification' },
        },
      },
    },
    pricing: {
      type: 'object',
      label: 'Pricing',
      properties: {
        service_price_rlusd: { type: 'number', default: 0, label: 'Service Price (RLUSD)' },
        stream_cost_rlusd: { type: 'number', default: 0, label: 'Stream Cost (RLUSD)' },
        stream_interval: {
          type: 'string',
          enum: ['second', 'minute', 'hour', 'day'],
          default: 'day',
          label: 'Stream Interval',
        },
      },
    },
  },
  // Hardcoded defaults for Chrome Skill NFTs
  defaults: {
    category: 'skill',
    widget_type: 'unlock',
    widget_class: 'unlock',
    ui_behavior: 'activate_feature',
    transferable: false,
    burnable: false,
  },
};

// ── AI Agent NFT custom_data schema ──────────────────────────────────────────
export const AGENT_CUSTOM_DATA_SCHEMA = {
  type: 'object',
  label: 'Agent Configuration',
  description: 'AI Agent identity and configuration blueprint',
  properties: {
    agent_name: { type: 'string', required: true, label: 'Agent Name' },
    role: {
      type: 'string',
      enum: ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'],
      default: 'citizen',
      label: 'Role',
    },
    purpose: { type: 'string', required: true, label: 'Purpose / Mission' },
    personality: { type: 'string', label: 'Personality' },
    tagline: { type: 'string', label: 'Tagline' },
    bio: { type: 'string', label: 'Bio' },
    avatar_url: { type: 'string', label: 'Avatar URL' },
    soul_bound: { type: 'boolean', default: true, label: 'Soul-Bound (Non-transferable)' },
    pricing: {
      type: 'object',
      label: 'Pricing',
      properties: {
        service_price_rlusd: { type: 'number', default: 0, label: 'Service Price (RLUSD)' },
        stream_cost_rlusd: { type: 'number', default: 0, label: 'Stream Cost (RLUSD)' },
        stream_interval: {
          type: 'string',
          enum: ['second', 'minute', 'hour', 'day'],
          default: 'day',
          label: 'Stream Interval',
        },
      },
    },
  },
  // Hardcoded defaults for Agent NFTs
  defaults: {
    category: 'agent_creation',
    widget_type: 'unlock',
    widget_class: 'unlock',
    ui_behavior: 'badge',
    burnable: false,
  },
};

// ── Infrastructure NFT custom_data schema ────────────────────────────────────
export const INFRASTRUCTURE_CUSTOM_DATA_SCHEMA = {
  type: 'object',
  label: 'Infrastructure Configuration',
  description: 'Admin-only platform infrastructure NFT — immutable after mint',
  properties: {
    category: {
      type: 'string',
      enum: ['agent_creation', 'governance', 'wallet_management', 'did_management', 'environment', 'training'],
      default: 'governance',
      label: 'Category',
    },
    widget_type: {
      type: 'string',
      enum: ['unlock', 'service'],
      default: 'unlock',
      label: 'Widget Type',
    },
    ui_behavior: {
      type: 'string',
      enum: ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'],
      default: 'unlock_page',
      label: 'UI Behavior',
    },
    feature_path: {
      type: 'string',
      label: 'Feature Path',
      description: 'Internal path this NFT unlocks',
    },
    nft_cost_rlusd: {
      type: 'number',
      default: 0,
      label: 'NFT Cost (RLUSD)',
      description: 'One-time price users pay to own this NFT',
    },
    service_fee_percent: {
      type: 'number',
      default: 0,
      min: 0,
      max: 100,
      label: 'Service Fee % → Treasury',
    },
    pricing: {
      type: 'object',
      label: 'Service Pricing',
      properties: {
        fixed_price_rlusd: { type: 'number', default: 0, label: 'Fixed Price (RLUSD)' },
        stream_cost_rlusd: { type: 'number', default: 0, label: 'Stream Cost (RLUSD)' },
        stream_interval: {
          type: 'string',
          enum: ['second', 'minute', 'hour', 'day'],
          default: 'day',
          label: 'Stream Interval',
        },
      },
    },
    immutable_after_mint: {
      type: 'array',
      label: 'Immutable Fields',
      description: 'Fields locked after minting on mainnet',
    },
  },
  defaults: {
    category: 'governance',
    widget_type: 'unlock',
    widget_class: 'unlock',
    ui_behavior: 'unlock_page',
    transferable: false,
    burnable: false,
  },
};

// ── Schema registry keyed by nft_type ────────────────────────────────────────
export const NFT_TYPE_SCHEMAS = {
  widget: WIDGET_CUSTOM_DATA_SCHEMA,
  chrome_skill: CHROME_SKILL_CUSTOM_DATA_SCHEMA,
  agent: AGENT_CUSTOM_DATA_SCHEMA,
  infrastructure: INFRASTRUCTURE_CUSTOM_DATA_SCHEMA,
};

// ── Validate custom_data against its schema ──────────────────────────────────
export function validateCustomData(customData, nftType) {
  const schema = NFT_TYPE_SCHEMAS[nftType];
  if (!schema) return [{ field: 'nft_type', error: `Unknown NFT type: ${nftType}` }];

  const errors = [];
  const props = schema.properties || {};

  for (const [key, def] of Object.entries(props)) {
    const val = customData[key];

    // Required check
    if (def.required && (val === undefined || val === null || val === '')) {
      errors.push({ field: key, error: `${def.label || key} is required` });
      continue;
    }

    // Enum check
    if (def.enum && val !== undefined && val !== '' && !def.enum.includes(val)) {
      errors.push({ field: key, error: `${def.label || key} must be one of: ${def.enum.join(', ')}` });
    }

    // Array items validation
    if (def.type === 'array' && Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (def.items?.properties) {
          for (const [ik, idef] of Object.entries(def.items.properties)) {
            if (idef.required && (!item[ik] || item[ik] === '')) {
              errors.push({ field: `${key}[${idx}].${ik}`, error: `${idef.label || ik} is required` });
            }
          }
        }
      });
    }
  }

  return errors;
}

// ── Generate default custom_data for a given NFT type ────────────────────────
export function getDefaultCustomData(nftType) {
  const schema = NFT_TYPE_SCHEMAS[nftType];
  if (!schema) return {};

  const data = {};
  const props = schema.properties || {};

  for (const [key, def] of Object.entries(props)) {
    if (def.default !== undefined) {
      data[key] = def.default;
    } else if (def.type === 'object' && def.properties) {
      const nested = {};
      for (const [nk, ndef] of Object.entries(def.properties)) {
        if (ndef.default !== undefined) nested[nk] = ndef.default;
      }
      data[key] = nested;
    } else if (def.type === 'array') {
      data[key] = [];
    } else if (def.type === 'string') {
      data[key] = '';
    } else if (def.type === 'number') {
      data[key] = 0;
    } else if (def.type === 'boolean') {
      data[key] = false;
    }
  }

  return data;
}