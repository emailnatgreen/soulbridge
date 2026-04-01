import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const normalizeToken = (value) => {
  const token = String(value || '').trim();
  if (!token) return undefined;
  if (token === 'Bearer') return undefined;
  if (token.startsWith('Bearer ')) {
    const raw = token.slice(7).trim();
    return raw || undefined;
  }
  return token;
};

const getLiveToken = () => normalizeToken(appParams.token) || normalizeToken(localStorage.getItem('base44_access_token')) || normalizeToken(localStorage.getItem('token')) || undefined;

// Create a client that supports public access and always reads the latest token
export const base44 = createClient({
  appId: appParams.appId,
  token: getLiveToken(),
  functionsVersion: appParams.functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl: appParams.appBaseUrl
});