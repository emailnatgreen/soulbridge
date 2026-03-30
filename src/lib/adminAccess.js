export const ADMIN_DID = 'did:xrpl:1:rL1W8aBjXscSHgkiBKQJyYeU9YBpWo2jqz';

export function normalizeDid(value) {
  if (!value) return '';
  return String(value).trim();
}

export function buildDidFromAddress(address) {
  if (!address) return '';
  return `did:xrpl:1:${String(address).trim()}`;
}

export function isAdminByDid(identityDid, classicAddress) {
  const did = normalizeDid(identityDid);
  const derivedDid = buildDidFromAddress(classicAddress);
  return did === ADMIN_DID || derivedDid === ADMIN_DID;
}

export function hasAdminAccess({ user, identityDid, classicAddress }) {
  return user?.role === 'admin' || isAdminByDid(identityDid, classicAddress);
}