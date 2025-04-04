import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserWallets, 
  getWalletBalances, 
  createWallet, 
  getUserCryptoTransactions,
  addCryptoPaymentMethod,
  getUserCryptoPaymentMethods
} from '@/services/cryptoService';

export function useWallet(userId?: string) {
  const { user } = useAuth();
  const actualUserId = userId || user?.userId;
  
  const [wallets, setWallets] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user wallet data
  useEffect(() => {
    if (actualUserId) {
      loadWalletData();
    } else {
      // Reset state if no user
      setWallets([]);
      setBalances([]);
      setTransactions([]);
      setPaymentMethods([]);
      setLoading(false);
    }
  }, [actualUserId]);

  const loadWalletData = async () => {
    if (!actualUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user wallets
      const userWallets = await getUserWallets(actualUserId);
      setWallets(userWallets);
      
      // If there are wallets, get balances and transactions
      if (userWallets.length > 0) {
        const walletId = userWallets[0].walletId;
        
        // Get balances for primary wallet
        const walletBalances = await getWalletBalances(walletId);
        setBalances(walletBalances);
        
        // Get transactions
        const userTransactions = await getUserCryptoTransactions(actualUserId);
        setTransactions(userTransactions);
        
        // Get payment methods
        const cryptoPaymentMethods = await getUserCryptoPaymentMethods(actualUserId);
        setPaymentMethods(cryptoPaymentMethods);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const createUserWallet = async (type: 'custodial' | 'non-custodial' = 'custodial') => {
    if (!actualUserId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await createWallet(actualUserId, type);
      await loadWalletData(); // Refresh data
      return result;
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError('Failed to create wallet. Please try again later.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (walletAddress: string, isDefault: boolean = false) => {
    if (!actualUserId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await addCryptoPaymentMethod(actualUserId, walletAddress, isDefault);
      await loadWalletData(); // Refresh data
      return result;
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError('Failed to add payment method. Please try again later.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshWalletData = () => {
    loadWalletData();
  };

  // Format balance to user-friendly string
  const formatBalance = (balance: any) => {
    if (!balance) return '0.00';
    return parseFloat(balance.amount).toFixed(4);
  };

  // Get total balance across all currencies
  const getTotalBalance = () => {
    if (balances.length === 0) return '0.00';
    
    const total = balances.reduce((sum, balance) => {
      return sum + parseFloat(balance.amount || '0');
    }, 0);
    
    return total.toFixed(4);
  };
  
  // Get the first wallet for convenience
  const wallet = wallets.length > 0 ? wallets[0] : null;

  return {
    wallet,
    wallets,
    balances,
    transactions,
    paymentMethods,
    loading,
    error,
    refreshWalletData,
    createWallet: createUserWallet,
    addPaymentMethod,
    formatBalance,
    getTotalBalance
  };
}
