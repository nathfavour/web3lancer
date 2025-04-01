import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Box, CircularProgress, Typography, Alert, Backdrop } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Account } from './Account';
import { WalletOptions } from './WalletOptions';
import { useEffect } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';

export function ConnectWallet() {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const { isLoading: isConnectLoading, error: connectError, reset: resetConnect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Add MetaMask SDK integration
  const { 
    isConnected: isMetaMaskConnected, 
    error: metaMaskError, 
    isPending: isMetaMaskPending 
  } = useMetaMask();
  
  const isLoading = isConnecting || isReconnecting || isConnectLoading || isMetaMaskPending;
  const error = connectError || metaMaskError;
  
  // Reset state when component mounts - important for modal reopening
  useEffect(() => {
    // Cancel any pending wallet connection attempts
    if (window.ethereum) {
      if (window.ethereum.removeAllListeners) {
        try {
          window.ethereum.removeAllListeners();
        } catch (e) {
          console.log("Couldn't remove ethereum listeners", e);
        }
      }
    }
    
    // Reset wagmi connection state
    resetConnect?.();
    
    return () => {
      // Also cleanup on unmount
      resetConnect?.();
    };
  }, [resetConnect]);

  // Track account changes
  useEffect(() => {
    function onConnect(data: any) {
      console.log("Connected!", {
        address: data.address,
        chainId: data.chainId,
        isReconnected: data.isReconnected
      });
    }

    function onDisconnect() {
      console.log("Disconnected!");
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Account changed:', accounts[0] || 'disconnected');
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Chain changed:', chainId);
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);
  
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4
      }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1">Connecting to wallet...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Error connecting to wallet: {error instanceof Error ? error.message : String(error)}
      </Alert>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isConnected || isMetaMaskConnected ? 'connected' : 'disconnected'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%'
        }}
      >
        {isConnected || isMetaMaskConnected ? <Account /> : <WalletOptions />}
      </motion.div>
    </AnimatePresence>
  );
}
