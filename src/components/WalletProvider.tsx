'use client';

import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/utils/config';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Create a client for TanStack Query
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Disable refetching on window focus for better user experience
        refetchOnWindowFocus: false,
        // Set reasonable retry settings
        retry: 1,
        retryDelay: 500,
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
