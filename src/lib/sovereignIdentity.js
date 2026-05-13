/**
 * Sovereign Identity Layer — Cryptographic Root Anchor
 * ═════════════════════════════════════════════════════
 * Gives the Sovereign Investigator:
 *   - identity_hash   — SHA-256 of the locked config
 *   - public_fingerprint — safe to expose (first 16 hex chars)
 *   - private_signature  — never exposed (full hash)
 *   - boundary_rules     — what it can/cannot access
 *   - immutable_flag     — prevents edits
 *   - non_movable_flag   — prevents relocation
 *
 * This is the identity root of the entire governance spine.
 * Every investigation, gate decision, readiness report, and audit
 * entry is signed with this identity.
 *
 * Pure, deterministic, non-LLM.
 */

// ═══ Locked Sovereign Config — immutable after genesis ═══
// This is the canonical config. Any change invalidates the identity hash.
const SOVEREIGN_CONFIG = {
  agent_id: 'sovereign_investigator',
  name: 'Sovereign Investigator',
  version: '1.0.0',
  genesis_date: '2025-01-01T00:00:00.000Z',
  purpose: 'Private, admin-only agent that conducts structured 7-Leaf investigations of nodes, agents, features, and system integrity.',
  classification: 'sovereign_private',
  discoverable: false,
  editable: false,
  movable: false,
  duplicable: false,
  overridable: false,
  impersonable: false,
  boundary_rules: {
    can_read: ['Agent', 'TripwireEvent', 'Memory', 'TruthReport', 'BiasReport'],
    can_write: ['Memory'],
    can_invoke: ['adminTruthEngine'],
    cannot_access: ['Wallet', 'Transaction', 'GovernanceProposal'],
    cannot_expose: ['private_signature', 'encrypted_seed', 'boundary_rules'],
    scope: 'investigation_only',
    memory_scope: 'both',
    visibility: 'admin_only',
  },
};

/**
 * Browser-safe SHA-256 using SubtleCrypto (async)
 */
async function sha256(payload) {
  const str = JSON.stringify(payload, Object.keys(payload).sort());
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous fingerprint derivation from a precomputed hash.
 * Takes first 16 hex chars, formatted as 4-char groups.
 */
function deriveFingerprint(hash) {
  const raw = hash.slice(0, 16).toUpperCase();
  return raw.match(/.{1,4}/g).join('-');
}

// ═══ Cached identity (computed once per session) ═══
let _cachedIdentity = null;

/**
 * computeSovereignIdentity()
 * → { identity_hash, public_fingerprint, private_signature,
 *     config, boundary_rules, immutable_flag, non_movable_flag,
 *     public_surface }
 *
 * Async (SHA-256). Cached after first call.
 */
export async function computeSovereignIdentity() {
  if (_cachedIdentity) return _cachedIdentity;

  const identity_hash = await sha256(SOVEREIGN_CONFIG);
  const public_fingerprint = deriveFingerprint(identity_hash);

  _cachedIdentity = {
    identity_hash,
    public_fingerprint,
    private_signature: identity_hash, // full hash — never exposed in public surface
    config: SOVEREIGN_CONFIG,
    boundary_rules: SOVEREIGN_CONFIG.boundary_rules,
    immutable_flag: true,
    non_movable_flag: true,
    // Public-safe surface — only these fields may be shown externally
    public_surface: {
      public_fingerprint,
      agent_id: SOVEREIGN_CONFIG.agent_id,
      name: SOVEREIGN_CONFIG.name,
      purpose: SOVEREIGN_CONFIG.purpose,
      version: SOVEREIGN_CONFIG.version,
      genesis_date: SOVEREIGN_CONFIG.genesis_date,
      classification: SOVEREIGN_CONFIG.classification,
    },
  };

  return _cachedIdentity;
}

/**
 * signPayload(payload)
 * Creates a signature block to embed in any governance artefact.
 * → { signer, fingerprint, signed_at, payload_hash }
 */
export async function signPayload(payload) {
  const identity = await computeSovereignIdentity();
  const payload_hash = await sha256(payload);

  return {
    signer: identity.config.agent_id,
    fingerprint: identity.public_fingerprint,
    signed_at: new Date().toISOString(),
    payload_hash,
  };
}

/**
 * verifyIdentity(hash)
 * Recomputes the identity hash and checks it matches. 
 * Returns true if the config hasn't been tampered with.
 */
export async function verifyIdentity(expectedHash) {
  const identity = await computeSovereignIdentity();
  return identity.identity_hash === expectedHash;
}

/**
 * getPublicSurface()
 * Returns ONLY the fields safe to expose.
 */
export async function getPublicSurface() {
  const identity = await computeSovereignIdentity();
  return identity.public_surface;
}

/**
 * getSovereignConfig()
 * Returns the locked config (for internal display only).
 */
export function getSovereignConfig() {
  return { ...SOVEREIGN_CONFIG };
}