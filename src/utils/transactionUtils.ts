/**
 * Transaction utilities for Web3Lancer
 */

import { FINANCE_DATABASE_ID, PLATFORM_TRANSACTIONS_COLLECTION_ID, USER_WALLETS_COLLECTION_ID } from '@/lib/env';

/**
 * Parse ether value to wei (as a hex string)
 * @param value Ether value as a string or number
 * @returns Hex string of wei value
 */
export function parseEther(value: string | number): string {
  const etherValue = typeof value === 'string' ? value : value.toString();
  
  // Convert ether to wei (1 ether = 10^18 wei)
  const weiValue = BigInt(Math.floor(parseFloat(etherValue) * 10**18));
  
  // Convert to hex string with '0x' prefix
  return `0x${weiValue.toString(16)}`;
}

/**
 * Format wei value to ether
 * @param weiValue Wei value as a hex string or BigInt
 * @returns Ether value as a string
 */
export function formatEther(weiValue: string | bigint): string {
  // Convert hex string to BigInt if needed
  const wei = typeof weiValue === 'string' 
    ? BigInt(weiValue.startsWith('0x') ? weiValue : `0x${weiValue}`)
    : weiValue;
    
  // Convert wei to ether (1 ether = 10^18 wei)
  return (Number(wei) / 10**18).toString();
}

/**
 * Wait for transaction receipt
 * @param provider Ethereum provider
 * @param hash Transaction hash
 * @param confirmations Number of confirmations to wait for (default: 1)
 * @returns Transaction receipt
 */
export async function waitForTransaction(
  provider: any,
  hash: string,
  confirmations: number = 1
): Promise<any> {
  return new Promise((resolve, reject) => {
    const checkReceipt = async () => {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        });
        
        if (receipt && receipt.blockNumber) {
          // Get current block number
          const currentBlock = await provider.request({
            method: 'eth_blockNumber',
            params: [],
          });
          
          // Check confirmations
          const confs = BigInt(currentBlock) - BigInt(receipt.blockNumber) + BigInt(1);
          if (confs >= BigInt(confirmations)) {
            resolve(receipt);
            return;
          }
        }
        
        // Check again after 2 seconds
        setTimeout(checkReceipt, 2000);
      } catch (err) {
        reject(err);
      }
    };
    
    // Start checking
    checkReceipt();
  });
}

/**
 * Get transaction by hash
 * @param provider Ethereum provider
 * @param hash Transaction hash
 * @returns Transaction details
 */
export async function getTransaction(provider: any, hash: string): Promise<any> {
  return await provider.request({
    method: 'eth_getTransactionByHash',
    params: [hash],
  });
}

/**
 * Record transaction in the database
 * @param userId User ID
 * @param txHash Transaction hash
 * @param fromAddress From address
 * @param toAddress To address
 * @param value Transaction value in wei
 * @param chainId Chain ID
 */
export async function recordTransaction(
  userId: string,
  txHash: string,
  fromAddress: string,
  toAddress: string,
  value: string,
  chainId: string
): Promise<void> {
  try {
    // Import necessary utilities
    const { databases, ID } = await import('@/utils/api');
    
    // First, create a general transaction record
    const transactionId = ID.unique();
    await databases.createDocument(
      FINANCE_DATABASE_ID, // Platform transactions database
      PLATFORM_TRANSACTIONS_COLLECTION_ID, // Platform transactions collection
      ID.unique(),
      {
        userId,
        amount: formatEther(value), // Convert wei to ether for storage
        type: 'crypto',
        createdAt: new Date().toISOString(),
        status: 'pending',
        transactionId: transactionId,
      }
    );
    
    // Then create a detailed crypto transaction record
    await databases.createDocument(
      FINANCE_DATABASE_ID, // Wallets database
      USER_WALLETS_COLLECTION_ID, // Crypto transactions collection
      ID.unique(),
      {
        cryptoTxId: ID.unique(),
        transactionId: transactionId,
        walletId: await getWalletIdForUser(userId), // Helper function to get wallet ID
        txHash: txHash,
        fromAddress: fromAddress,
        toAddress: toAddress,
        status: 'pending',
        network: chainId,
      }
    );
    
    console.log('Transaction recorded successfully', {
      userId,
      txHash,
      transactionId
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw new Error(`Failed to record transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to get wallet ID for a user
 * If user doesn't have a wallet, creates one
 */
async function getWalletIdForUser(userId: string): Promise<string> {
  try {
    const { databases, Query, ID } = await import('@/utils/api');
    
    // Check if user already has a wallet
    const wallets = await databases.listDocuments(
      FINANCE_DATABASE_ID,
      USER_WALLETS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );
    
    // If wallet exists, return its ID
    if (wallets.documents.length > 0) {
      return wallets.documents[0].walletId;
    }
    
    // If no wallet exists, use createWallet from walletUtils
    const { createUserWallet } = await import('@/utils/walletUtils');
    const walletId = await createUserWallet(userId);
    
    return walletId;
  } catch (error) {
    console.error('Error getting wallet ID:', error);
    throw new Error(`Failed to get wallet ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export functions
export {
  getWalletIdForUser
};
