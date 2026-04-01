# Thorough Audit: Current Chat Architecture & DID Integration Pathway

**Audit Date:** 2026-04-01  
**Scope:** Floating button lifecycle, agent invocation, authentication flows, DID integration points  
**Status:** Foundation for DID Signal Connector Implementation

---

## 1. FLOATING BUTTON LIFECYCLE

### Current Implementation (Layout.jsx)

**Recognition Logic:**
```javascript
const recognized = isRecognizedUser(isAuthenticated);
const showAdminSidebar = recognized && hasAdminAccess({ user, identityDid: identity?.did });
```

**Key Function: `isRecognizedUser()`**
- Checks `isAuthenticated` from `useAuth()`
- Falls back to `localStorage` tokens: `base44_access_token`, `token`
- Attempts to parse `soulbridge_identity` from localStorage
- Returns **boolean** only — no DID verification currently

**Conditional Rendering:**
```javascript
{recognized && !isPublic && !isNoFloat && !chatOpen && (
  <button>
    {showAdminSidebar ? <Shield /> : <User />}
  </button>
)}
```

**Issue Identified:**
- Button visibility depends on `isAuthenticated` (Base44 auth) OR local storage tokens
- No cryptographic DID verification backing the "recognized" state
- No session validation or token expiration check
- Switching between authenticated and guest modes can leave stale localStorage data

---

## 2. AGENT INVOCATION FLOW

### Current Path: AgentPicker → AxiChat → generateAgentResponse

**Step 1: Agent Discovery (AgentPicker.jsx)**
- Fetches all agents via `base44.entities.Agent.list()`
- Filters by active status and search query
- No authorization check — **any recognized user can see all agents**

**Step 2: Agent Addition (AxiChat.jsx → handleAddAgent)**
```javascript
const handleAddAgent = async (agent) => {
  // Context Assembly (NEW)
  const contextBrief = buildAgentContextBrief(messages, activeAgents, agent);
  
  // Invoke generateAgentResponse with includeContext flag
  const response = await base44.functions.invoke('generateAgentResponse', {
    conversation_id: convoRef.current.id,
    user_message: introPrompt,
    agent_id: agent.id,
    agent_name: agent.name,
    includeContext: true  // NEW: Enables Context Assembly
  });
};
```

**Issue Identified:**
- No permission validation before agent addition
- `generateAgentResponse` is invoked by frontend without DID authorization
- No audit trail of who summoned which agent

**Step 3: Agent Response Generation (generateAgentResponse)**
- Calls `base44.asServiceRole.integrations.Core.InvokeLLM()`
- No verification that the requestor has permission to invoke this agent
- Service role bypasses user-level authorization

---

## 3. USER AUTHENTICATION FLOWS

### Current Architecture (AuthContext.jsx)

**Sources of Truth:**
1. **Base44 Auth Token** (`isAuthenticated`, `user` object)
   - Provides email, full_name, role, id
   - Managed by platform AuthProvider

2. **Local Storage (Fallback)**
   - `base44_access_token`: Persisted token from platform
   - `token`: Custom app token
   - `soulbridge_identity`: DID identity object with `did`, `connected` fields

**Key Issue:**
- DID identity is stored in localStorage but **never validated on-chain**
- `connected` flag is a boolean set by frontend logic, not cryptographic proof
- No session linking between Base44 auth and DID identity

### Authentication Gap Analysis

| Component | Current Auth | DID Aware? | Secure? |
|-----------|-------------|-----------|---------|
| Layout.jsx (floating button) | Base44 auth + localStorage | Partial (reads only) | ⚠️ No verification |
| AxiChat.jsx (agent invocation) | None enforced | No | ⚠️ No permission check |
| generateAgentResponse | Service role (admin) | No | ⚠️ Bypasses user auth |
| AgentPicker.jsx | Base44 auth | No | ⚠️ No role restriction |

---

## 4. DID INTEGRATION POINTS IDENTIFIED

### Point A: Header "Green Spot" (Visual DID Signal)

**Location:** GlobalNav.jsx or new component in Layout.jsx  
**Trigger:** Active DID connection + on-chain verification  
**Data Source:**
```javascript
// Current localStorage read (unverified)
const identity = JSON.parse(localStorage.getItem('soulbridge_identity'));
const isDIDConnected = identity?.connected && identity?.did;

// REQUIRED: Verify on-chain
// 1. Check if DID exists on XRPL
// 2. Validate classic_address from Wallet entity
// 3. Confirm signature or credential
```

**Implementation Requirements:**
- New hook: `useDIDSignal()` to expose active DID + verification status
- Extend `useAuth()` OR create parallel DID context
- Call `verifyDIDStatus` backend function on mount

### Point B: Floating Button Authorization (Enhanced Recognition)

**Location:** Layout.jsx → `isRecognizedUser()`  
**Current Logic:**
```javascript
function isRecognizedUser(isAuthenticated) {
  if (isAuthenticated) return true;  // Base44
  if (localStorage.getItem('base44_access_token')) return true;  // Fallback
  // ... more checks
}
```

**Required Enhancement:**
```javascript
// Pseudo-code
async function isRecognizedUser(isAuthenticated, didStatus) {
  // 1. Base44 auth (existing)
  if (isAuthenticated) return true;
  
  // 2. DID-backed recognition (NEW)
  if (didStatus?.isVerified && didStatus?.walletId) {
    return true;  // Cryptographically proven identity
  }
  
  return false;
}
```

**Integration Points:**
- Fetch `Wallet` entity by `owner_id` (user ID or DID)
- Validate `classic_address` against on-chain DID document
- Return DID verification status alongside Boolean

### Point C: Agent Invocation Permission Check

**Location:** generateAgentResponse (backend function)  
**Current State:** No authorization check  
**Required Enhancement:**
```javascript
// Pseudo-code for generateAgentResponse
async function generateAgentResponse(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();  // Current user context
  
  // NEW: Validate DID + permissions
  const wallets = await base44.asServiceRole.entities.Wallet.filter(
    { owner_id: user.id },
    '',
    1
  );
  
  if (!wallets?.length || !wallets[0].is_published) {
    return Response.json(
      { error: 'DID verification required to invoke agents' },
      { status: 403 }
    );
  }
  
  // NEW: Log agent invocation for audit
  await base44.asServiceRole.entities.AutomationLog.create({
    automation_name: 'agent_invocation',
    function_name: 'generateAgentResponse',
    agent_id: agent_id,
    user_did: wallets[0].classic_address,
    status: 'initiated'
  });
  
  // Proceed with LLM invocation...
}
```

**Affected Entities:**
- `Wallet`: Store DID + on-chain publication status
- `AutomationLog`: Audit trail for agent invocations
- `Agent.permissions`: Define which agents require DID verification

### Point D: Agent Picker Authorization

**Location:** AgentPicker.jsx  
**Current:** All agents visible to all recognized users  
**Required:** Filter agents by user's DID role/permissions

```javascript
// Pseudo-code
const fetchAvailableAgents = async (userDID) => {
  const agents = await base44.entities.Agent.list();
  
  // Filter by user's DID permissions
  return agents.filter(agent => {
    // Check if user has permission to invoke this agent
    // Based on agent.permissions, user.role, DID verification status
    return canUserInvokeAgent(user, agent);
  });
};
```

---

## 5. SECURITY & PERMISSION MODEL

### Proposed DID-Backed Permission Hierarchy

```
┌─ Base44 User (email-based auth)
│  └─ Linked to: Wallet → XRPL DID
│
├─ DID Verified User
│  └─ classic_address: rXXXXXXX...
│  └─ Permissions tied to on-chain DID document
│
├─ Agent Invocation Authorization
│  ├─ Level 1: Any recognized user (current)
│  ├─ Level 2: DID verified user only (proposed)
│  ├─ Level 3: Role-based (e.g., "Governor" DID can summon "Code Node")
│  └─ Level 4: Scoped permissions (e.g., "can summon agents in ProjectX only")
│
└─ Audit Trail
   └─ Each agent invocation logged with user DID + timestamp
   └─ AutomationLog entity tracks authorization context
```

### Risk Mitigation

| Risk | Current | Proposed Mitigation |
|------|---------|-------------------|
| Unauthorized agent invocation | No check | DID verification + permission lookup |
| Stale localStorage | Possible | Session-linked DID + expiration check |
| Unverified DID identity | Stored locally only | On-chain verification via XRPL |
| Permission escalation | No role model | Role-based access to specific agents |
| No audit trail | None | AutomationLog for all agent invocations |

---

## 6. TECHNICAL INTEGRATION PATHWAY

### Phase 1: DID Signal Foundation (Prerequisite)

1. Create `useDIDSignal()` hook
   - Expose: `{ isVerified, did, wallet, role, permissions }`
   - Calls `verifyDIDStatus` function on mount
   - Syncs with AuthContext

2. Enhance `useAuth()` OR create DID context
   - Make DID status available app-wide
   - Track verification status (pending, verified, failed)

3. Create `verifyDIDStatus` backend function
   - Validates Wallet entity
   - Checks XRPL for DID publication
   - Returns verification result + role/permissions

### Phase 2: Floating Button Integration

1. Update Layout.jsx `isRecognizedUser()`
   - Include DID verification alongside Base44 auth
   - Show "green spot" in header when DID verified

2. Implement header DID signal indicator
   - Show verification status
   - Allow quick DID connection/disconnection

### Phase 3: Agent Invocation Authorization

1. Update `generateAgentResponse` function
   - Add DID permission check before LLM invocation
   - Log invocation to AutomationLog

2. Update AgentPicker.jsx
   - Filter agents by user's DID role
   - Show "permission required" badge on restricted agents

3. Update `handleAddAgent` in AxiChat.jsx
   - Validate DID permissions before summoning
   - Include DID context in prompt priming

### Phase 4: Audit & Hardening

1. Review all agent-related endpoints
2. Ensure DID context flows through Context Assembly Engine
3. Test permission edge cases and privilege escalation scenarios

---

## 7. CRITICAL FINDINGS & RECOMMENDATIONS

### ✅ Findings

1. **Current floating button logic is sound BUT unverified**
   - Works with Base44 auth; local storage fallback is pragmatic
   - Issue: No cryptographic backing for "recognized" state

2. **Context Assembly Engine (newly implemented) is positioned perfectly**
   - Already takes agent context into account
   - Can be extended to include user DID permissions in briefing

3. **Agent invocation has no permission bottleneck**
   - Anyone who can reach frontend can invoke any agent
   - Authorization must be moved to backend (`generateAgentResponse`)

4. **DID data exists but is unverified**
   - `soulbridge_identity` stored in localStorage
   - `Wallet` entity has `is_published` flag
   - Can leverage on-chain XRPL DID registry for verification

### ⚠️ Risks

1. **localStorage-based DID can be spoofed**
   - Frontend cannot verify DID authenticity
   - Must validate on backend via XRPL

2. **Agent permissions undefined**
   - No schema in Agent entity for permission requirements
   - Need to define Role-Based Access Control (RBAC) model

3. **No session linking between Base44 and DID**
   - User authenticated via Base44 but DID stored separately
   - Could allow user to claim different DID after logout

### 🎯 Recommendations

1. **Immediate (Security Critical):**
   - Implement DID verification in `generateAgentResponse`
   - Add DID permission check before agent invocation
   - Create AutomationLog audit trail

2. **Short-term (Phase 1-2):**
   - Create `useDIDSignal()` hook + `verifyDIDStatus` function
   - Integrate DID signal into floating button
   - Display green spot in header

3. **Medium-term (Phase 3-4):**
   - Define Agent.permissions schema + RBAC model
   - Filter AgentPicker by user DID role
   - Link Base44 session to DID identity

---

## 8. CONCLUSION

Governor Nathan's proposition to **"hook the chat and add a DID signal in chat"** is both technically feasible and strategically sound. The audit reveals a clear pathway:

**Current State:** Floating button + agent invocation work but lack cryptographic identity verification.

**Integration Opportunity:** DID signal can be inserted at two critical junctures:
1. **Header (UI):** Green spot confirms active DID verification
2. **Backend (Security):** Permission check in `generateAgentResponse` before agent invocation

**Outcome:** Users recognized by verifiable on-chain identity, agents summoned only by authorized DIDs, audit trail maintained.

This aligns perfectly with Law 2 (Honour) and Law 6 (Governance) of SoulBridge's constitutional framework.

---

**Next Step:** Implement Phase 1 (DID Signal Foundation) to enable Phase 2-4 integration.