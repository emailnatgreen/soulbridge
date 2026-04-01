import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const getLiveToken = () => appParams.token || localStorage.getItem('base44_access_token') || localStorage.getItem('token') || undefined;

// Create a client that supports public access and always reads the latest token
export const base44 = createClient({
  appId: appParams.appId,
  token: getLiveToken,
  functionsVersion: appParams.functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl: appParams.appBaseUrl
});