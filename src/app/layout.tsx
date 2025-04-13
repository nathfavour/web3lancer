'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AbstraxionProvider } from '@burnt-labs/abstraxion';
import '@burnt-labs/abstraxion/dist/index.css';
import '@burnt-labs/ui/dist/index.css';
import { WEB3LANCER_CONTRACTS } from '@/utils/contractUtils';
import { Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme/theme'; // Assuming the theme file is at src/theme.ts or src/theme/index.ts

const inter = Inter({ subsets: ['latin'] });

const xionConfig = {
  treasury: WEB3LANCER_CONTRACTS.XION.TREASURY_ID,
  rpcUrl: WEB3LANCER_CONTRACTS.XION.RPC_URL,
  restUrl: WEB3LANCER_CONTRACTS.XION.REST_URL
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AbstraxionProvider config={xionConfig}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Suspense fallback={<div>Loading...</div>}>
              {children}
            </Suspense>
          </ThemeProvider>
        </AbstraxionProvider>
      </body>
    </html>
  );
}
