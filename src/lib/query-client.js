import { QueryClient } from '@tanstack/react-query';

const retryDelay = (attemptIndex) => {
	// Exponential backoff: 1s, 2s, 4s, 8s...
	return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
};

const shouldRetry = (failureCount, error) => {
	// Retry on 429 (rate limit) or 5xx errors, but not 4xx (except 429)
	const status = error?.status;
	if (status === 429) return failureCount < 5;
	if (status >= 500) return failureCount < 3;
	return false;
};

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
			staleTime: 0,
			retry: shouldRetry,
			retryDelay,
		},
	},
});