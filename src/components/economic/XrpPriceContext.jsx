import React, { createContext, useContext } from 'react';
import { useXrpPrice } from '@/hooks/useXrpPrice';

const XrpPriceContext = createContext({ price: 1.31, source: 'fallback' });

export function XrpPriceProvider({ children }) {
  const { price, source, isLoading } = useXrpPrice();
  return (
    <XrpPriceContext.Provider value={{ price, source, isLoading }}>
      {children}
    </XrpPriceContext.Provider>
  );
}

export function useXrpPriceContext() {
  return useContext(XrpPriceContext);
}