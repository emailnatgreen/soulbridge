import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Credential-to-Role mapping rules
const CREDENTIAL_ROLE_MAP = {
  guardian: {
    requiredCredentials: [
      { type: 'skill_certification', skillName: 'Project Management', minLevel: 4 },
      { type: 'professional_license', name: 'Conflict Resolution' }
    ],
    permissions: {
      can_create_agents: true,
      can_send_xrp: true,
      can_access_treasury: true,
      can_vote: true,
      can_evaluate_agents: true
    }
  },
  creator: {
    requiredCredentials: [
      { type: 'skill_certification', skillName: 'Creative Design', minLevel: 3 }
    ],
    permissions: {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: false
    }
  },
  teacher: {
    requiredCredentials: [
      { type: 'skill_certification', skillName: 'Knowledge Transfer', minLevel: 3 },
      { type: 'professional_license', name: 'Teaching Certification' }
    ],
    permissions: {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: true
    }
  },
  trader: {
    requiredCredentials: [
      { type: 'skill_certification', skillName: 'Resource Trading', minLevel: 2 }
    ],
    permissions: {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: false
    }
  },
  healer: {
    requiredCredentials: [
      { type: 'skill_certification', skillName: 'Wellbeing Support', minLevel: 3 }
    ],
    permissions: {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: false
    }
  }
};

function extractCredentialData(credential) {
  const data = credential.credential_data || {};
  return {
    skillName: data.skill_name || data.skillName,
    level: data.level,
    certificationName: data.certification_name || data.certificationName
  };
}

function checkRoleEligibility(credentials, roleRequirements) {
  return roleRequirements.every(requirement => {
    return credentials.some(cred => {
      const data = extractCredentialData(cred);
      
      if (requirement.type === 'skill_certification' && cred.credential_type === 'skill_certification') {
        return data.skillName === requirement.skillName && 
               (data.level || 0) >= requirement.minLevel;
      }
      
      if (requirement.type === 'professional_license' && cred.credential_type === 'professional_license') {
        return data.certificationName === requirement.name || cred.credential_name === requirement.name;
      }
      
      return false;
    });
  });
}

function determineNewRole(credentials) {
  // Check roles in order of seniority
  const roleOrder = ['guardian', 'teacher', 'creator', 'trader', 'healer'];
  
  for (const role of roleOrder) {
    const requirements = CREDENTIAL_ROLE_MAP[role].requiredCredentials;
    if (checkRoleEligibility(credentials, requirements)) {
      return role;
    }
  }
  
  return 'citizen'; // Default role
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return Response.json({ error: 'Missing agent_id' }, { status: 400 });
    }

    // Fetch agent and their credentials
    const agent = await base44.entities.Agent.get(agent_id);
    const credentials = await base44.entities.DidCredential.filter({
      subject_did: agent.classic_address,
      status: 'active'
    });

    // Determine new role based on credentials
    const newRole = determineNewRole(credentials);
    const newPermissions = CREDENTIAL_ROLE_MAP[newRole]?.permissions || {
      can_create_agents: false,
      can_send_xrp: true,
      can_access_treasury: false,
      can_vote: true,
      can_evaluate_agents: false
    };

    // Track what changed for audit trail
    const roleChanged = agent.role !== newRole;
    const oldRole = agent.role;

    // Update agent with new role and permissions
    await base44.entities.Agent.update(agent_id, {
      role: newRole,
      permissions: newPermissions
    });

    // Create audit log entry documenting the change
    if (roleChanged) {
      const credentialSummary = credentials
        .map(c => `${c.credential_name} (${c.credential_type})`)
        .join(', ');

      await base44.entities.DidAuditLog.create({
        action_type: 'agent_updated',
        did_classic_address: agent.classic_address,
        agent_id: agent_id,
        user_id: user.id,
        user_email: user.email,
        action_details: {
          change_type: 'role_and_permissions_update',
          old_role: oldRole,
          new_role: newRole,
          trigger: 'credential_verification',
          credentials_evaluated: credentialSummary,
          permissions_granted: Object.keys(newPermissions).filter(k => newPermissions[k])
        },
        success: true
      });
    }

    return Response.json({
      success: true,
      agent_id,
      old_role: oldRole,
      new_role: newRole,
      permissions: newPermissions,
      credentials_count: credentials.length,
      role_changed: roleChanged
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});