import { writable, derived } from 'svelte/store';
import { ethers } from 'ethers';

// Enhanced pending transactions tracker with status monitoring
const _pending = writable([]);

export const pendingTxs = {
  subscribe: _pending.subscribe,
  
  // Add a new pending transaction
  add(tx) { 
    const pendingTx = {
      hash: tx.hash,
      type: tx.type || 'transaction',
      tokenIn: tx.tokenIn || null,
      tokenOut: tx.tokenOut || null,
      amount: tx.amount || null,
      timestamp: Date.now(),
      status: 'pending',
      confirmations: 0,
      gasUsed: null,
      receipt: null
    };
    
    _pending.update(txs => [...txs, pendingTx]);
    
    // Start monitoring this transaction
    monitorTransaction(pendingTx);
  },
  
  // Update transaction status
  updateStatus(hash, status, receipt = null) {
    _pending.update(txs => 
      txs.map(tx => 
        tx.hash === hash 
          ? { ...tx, status, receipt, confirmations: receipt?.confirmations || 0, gasUsed: receipt?.gasUsed }
          : tx
      )
    );
  },
  
  // Remove transaction
  remove(hash) { 
    _pending.update(txs => txs.filter(tx => tx.hash !== hash)); 
  },
  
  // Clear all transactions
  clear() { 
    _pending.set([]); 
  },
  
  // Get transactions by type
  getByType(type) {
    return derived(_pending, $txs => $txs.filter(tx => tx.type === type));
  }
};

export const pendingCount = derived(_pending, $txs => $txs.length);
export const hasSwapPending = derived(_pending, $txs => $txs.some(tx => tx.type === 'swap' && tx.status === 'pending'));
export const hasDepositPending = derived(_pending, $txs => $txs.some(tx => tx.type === 'deposit' && tx.status === 'pending'));

// Monitor transaction status
async function monitorTransaction(tx) {
  try {
    // Get provider for monitoring
    const provider = new ethers.JsonRpcProvider('https://mainnet-rpc.rnk.dev/');
    
    // Wait for transaction to be mined
    const receipt = await provider.waitForTransaction(tx.hash, 1, 300000); // 5 minute timeout
    
    if (receipt) {
      if (receipt.status === 1) {
        pendingTxs.updateStatus(tx.hash, 'confirmed', receipt);
        console.log(`✅ Transaction confirmed: ${tx.hash}`);
        
        // Auto-remove after 5 seconds for success
        setTimeout(() => {
          pendingTxs.remove(tx.hash);
        }, 5000);
      } else {
        pendingTxs.updateStatus(tx.hash, 'failed', receipt);
        console.log(`❌ Transaction failed: ${tx.hash}`);
        
        // Auto-remove after 10 seconds for failure
        setTimeout(() => {
          pendingTxs.remove(tx.hash);
        }, 10000);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to monitor transaction ${tx.hash}:`, error.message);
    pendingTxs.updateStatus(tx.hash, 'unknown');
    
    // Auto-remove unknown status after 30 seconds
    setTimeout(() => {
      pendingTxs.remove(tx.hash);
    }, 30000);
  }
}
