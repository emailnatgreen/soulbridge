import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Resolves the current platform user to their Agent entity.
 * Matches by: created_by email, or wallet owner_id, or agent name.
 * Returns { agent, isLoading } where agent is the matched Agent or null.
 */
export function useMyAgent() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60000,
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['allAgentsForMapping'],
    queryFn: () => base44.entities.Agent.list('-created_date', 500),
    staleTime: 30000,
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['userWalletsForMapping'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100),
    staleTime: 30000,
    enabled: !!user,
  });

  // Match user to agent via multiple strategies
  let myAgent = null;
  if (user && agents.length > 0) {
    const userEmail = user.email;
    const userName = user.full_name;

    // Strategy 1: Agent created by same email
    myAgent = agents.find(a => a.created_by === userEmail);

    // Strategy 2: Agent linked to a wallet owned by this user
    if (!myAgent && wallets.length > 0) {
      const myWalletIds = wallets.map(w => w.id);
      myAgent = agents.find(a => a.wallet_id && myWalletIds.includes(a.wallet_id));
    }

    // Strategy 3: Agent name matches user full_name
    if (!myAgent && userName) {
      myAgent = agents.find(a => 
        a.name?.toLowerCase() === userName.toLowerCase()
      );
    }
  }

  return {
    user,
    myAgent,
    allAgents: agents,
    isLoading: agentsLoading || walletsLoading,
  };
}