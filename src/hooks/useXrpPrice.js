import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const FALLBACK_RATE = 1.31;

export function useXrpPrice() {
  const { data, isLoading } = useQuery({
    queryKey: ['xrp-live-price'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getXrpPrice', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    price: data?.price ?? FALLBACK_RATE,
    source: data?.source ?? 'fallback',
    isLoading,
  };
}