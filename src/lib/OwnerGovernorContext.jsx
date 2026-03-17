import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OwnerGovernorContext = createContext(null);

export function OwnerGovernorProvider({ children }) {
  const [ownerId, setOwnerId] = useState(null);
  const [governorId, setGovernorId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setOwnerId(user.id);
          // Check if user has governor role
          setGovernorId(user.role === 'admin' ? user.id : null);
        }
      } catch (error) {
        console.error('Failed to load owner/governor info:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <OwnerGovernorContext.Provider value={{ ownerId, governorId, loading }}>
      {children}
    </OwnerGovernorContext.Provider>
  );
}

export function useOwnerGovernor() {
  const context = useContext(OwnerGovernorContext);
  if (!context) {
    throw new Error('useOwnerGovernor must be used within OwnerGovernorProvider');
  }
  return context;
}