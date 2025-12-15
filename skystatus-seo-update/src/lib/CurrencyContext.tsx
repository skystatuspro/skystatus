// src/lib/CurrencyContext.tsx
// Global currency context for the application

import React, { createContext, useContext, ReactNode } from 'react';
import { CurrencyCode, getCurrencySymbol, formatCurrency, formatCurrencyShort, formatCurrencyPrecise } from '../utils/format';

interface CurrencyContextValue {
  currency: CurrencyCode;
  symbol: string;
  format: (value: number) => string;
  formatShort: (value: number) => string;
  formatPrecise: (value: number, decimals?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  currency: CurrencyCode;
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ currency, children }) => {
  const value: CurrencyContextValue = {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (val: number) => formatCurrency(val, currency),
    formatShort: (val: number) => formatCurrencyShort(val, currency),
    formatPrecise: (val: number, decimals?: number) => formatCurrencyPrecise(val, currency, decimals),
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextValue => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Fallback to EUR if used outside provider (shouldn't happen, but safe default)
    return {
      currency: 'EUR',
      symbol: '€',
      format: (val: number) => formatCurrency(val, 'EUR'),
      formatShort: (val: number) => formatCurrencyShort(val, 'EUR'),
      formatPrecise: (val: number, decimals?: number) => formatCurrencyPrecise(val, 'EUR', decimals),
    };
  }
  return context;
};
