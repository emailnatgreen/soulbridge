// All admin XRPL addresses — both editor and live DIDs
const ADMIN_ADDRESSES = [
  'rL1W8aBjXscSHgkiBKQJyYeU9YBpWo2jqz',
  'rG1ZAbWEnBegAXFqyqyi8vgQFhDtDHAQH7',
  'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', // Governor Nathan - Human Node (wallet)
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', // Governor Nathan - active DID on dashboard
];

export const ADMIN_DID = 'did:xrpl:1:' + ADMIN_ADDRESSES[0];

/** Extract the raw XRPL address from any DID format */
function extractAddress(did) {
  if (!did) return '';
  const s = String(did).trim();
  // Handle did:xrpl:1:rXXX or did:xrpl:rXXX
  const match = s.match(/^did:xrpl:(?:1:)?(.+)$/);
  if (match) return match[1];
  // If it's already a raw address starting with 'r'
  if (s.startsWith('r')) return s;
  return s;
}

export function normalizeDid(value) {
  if (!value) return '';
  return String(value).trim();
}

export function buildDidFromAddress(address) {
  if (!address) return '';
  return `did:xrpl:1:${String(address).trim()}`;
}

export function isAdminByDid(identityDid, classicAddress) {
  const addr1 = extractAddress(identityDid);
  const addr2 = classicAddress ? String(classicAddress).trim() : '';
  return ADMIN_ADDRESSES.includes(addr1) || ADMIN_ADDRESSES.includes(addr2);
}

export function hasAdminAccess({ user, identityDid, classicAddress }) {
  return user?.role === 'admin' || isAdminByDid(identityDid, classicAddress);
}