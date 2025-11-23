/**
 * FREACT Faucet Service - Usage Examples
 * 
 * This file demonstrates how to use the FREACT faucet service
 * in your application.
 */

import { freactFaucetService } from '../services/FREACTFaucetService.js';

// Example contract address (replace with your deployed address)
const FREACT_CONTRACT_ADDRESS = '0xYourContractAddressHere';
const USER_ADDRESS = '0xUserWalletAddress';

/**
 * Example 1: Initialize and Check User Status
 */
async function checkUserStatus() {
  try {
    // Initialize the service
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    // Get comprehensive user status
    const status = await freactFaucetService.getUserStatus(USER_ADDRESS);
    
    console.log('User Status:', {
      freactBalance: status.freactBalance,
      canClaim: status.canClaim,
      isEligible: status.isEligible,
      remainingAllowance: status.remainingAllowance,
      gasBalance: status.gasBalance.balance,
      hasEnoughGas: status.gasBalance.hasEnough
    });
    
    return status;
  } catch (error) {
    console.error('Failed to check user status:', error);
  }
}

/**
 * Example 2: Claim Tokens
 */
async function claimTokens() {
  try {
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    // Check if user can claim
    const canClaim = await freactFaucetService.canClaim(USER_ADDRESS);
    if (!canClaim) {
      console.log('Cannot claim yet. Check next claim time.');
      return;
    }
    
    // Check gas balance
    const gasBalance = await freactFaucetService.checkGasBalance(USER_ADDRESS);
    if (!gasBalance.hasEnough) {
      console.log('Insufficient gas. Need at least', gasBalance.required, 'REACT');
      console.log('Get REACT from:', freactFaucetService.getReactFaucetUrl());
      return;
    }
    
    // Claim tokens
    console.log('Claiming tokens...');
    const result = await freactFaucetService.claimTokens(USER_ADDRESS);
    
    console.log('Success!', {
      amount: result.amount,
      txHash: result.txHash
    });
    
    return result;
  } catch (error) {
    console.error('Claim failed:', error.message);
  }
}

/**
 * Example 3: Check Next Claim Time
 */
async function checkNextClaimTime() {
  try {
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    const nextClaim = await freactFaucetService.getNextClaimTime(USER_ADDRESS);
    
    if (nextClaim.canClaimNow) {
      console.log('✅ Can claim now!');
    } else {
      const timeRemaining = freactFaucetService.formatTimeRemaining(nextClaim.timeUntilClaim);
      console.log('⏰ Next claim in:', timeRemaining);
    }
    
    return nextClaim;
  } catch (error) {
    console.error('Failed to check next claim time:', error);
  }
}

/**
 * Example 4: Get Faucet Statistics
 */
async function getFaucetStats() {
  try {
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    const stats = await freactFaucetService.getFaucetStats();
    
    console.log('Faucet Statistics:', {
      remainingSupply: stats.remainingSupply + ' FREACT',
      totalClaims: stats.totalClaims,
      uniqueUsers: stats.uniqueUsers
    });
    
    return stats;
  } catch (error) {
    console.error('Failed to get faucet stats:', error);
  }
}

/**
 * Example 5: Monitor User Balance
 */
async function monitorBalance() {
  try {
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    // Get initial balance
    const initialBalance = await freactFaucetService.getBalance(USER_ADDRESS);
    console.log('Initial balance:', initialBalance, 'FREACT');
    
    // Poll for balance changes every 5 seconds
    const interval = setInterval(async () => {
      const currentBalance = await freactFaucetService.getBalance(USER_ADDRESS);
      
      if (currentBalance !== initialBalance) {
        console.log('Balance changed!', {
          old: initialBalance,
          new: currentBalance,
          difference: (parseFloat(currentBalance) - parseFloat(initialBalance)).toFixed(2)
        });
        clearInterval(interval);
      }
    }, 5000);
    
    // Stop monitoring after 1 minute
    setTimeout(() => {
      clearInterval(interval);
      console.log('Stopped monitoring');
    }, 60000);
    
  } catch (error) {
    console.error('Failed to monitor balance:', error);
  }
}

/**
 * Example 6: Complete Claim Flow with Error Handling
 */
async function completeClaimFlow() {
  try {
    console.log('🎯 Starting claim flow...\n');
    
    // Step 1: Initialize
    console.log('1️⃣ Initializing service...');
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    console.log('✅ Service initialized\n');
    
    // Step 2: Check gas balance
    console.log('2️⃣ Checking gas balance...');
    const gasBalance = await freactFaucetService.checkGasBalance(USER_ADDRESS);
    console.log(`   REACT balance: ${gasBalance.balance}`);
    
    if (!gasBalance.hasEnough) {
      console.log('❌ Insufficient gas!');
      console.log(`   Need: ${gasBalance.required} REACT`);
      console.log(`   Get REACT: ${freactFaucetService.getReactFaucetUrl()}`);
      return { success: false, reason: 'insufficient_gas' };
    }
    console.log('✅ Gas balance sufficient\n');
    
    // Step 3: Check claim eligibility
    console.log('3️⃣ Checking claim eligibility...');
    const canClaim = await freactFaucetService.canClaim(USER_ADDRESS);
    
    if (!canClaim) {
      const nextClaim = await freactFaucetService.getNextClaimTime(USER_ADDRESS);
      const timeRemaining = freactFaucetService.formatTimeRemaining(nextClaim.timeUntilClaim);
      console.log('❌ Cannot claim yet');
      console.log(`   Next claim in: ${timeRemaining}`);
      return { success: false, reason: 'cooldown', timeRemaining };
    }
    console.log('✅ Eligible to claim\n');
    
    // Step 4: Check remaining allowance
    console.log('4️⃣ Checking remaining allowance...');
    const remaining = await freactFaucetService.getRemainingAllowance(USER_ADDRESS);
    console.log(`   Remaining: ${remaining} FREACT`);
    
    if (parseFloat(remaining) === 0) {
      console.log('❌ Maximum claim limit reached');
      return { success: false, reason: 'limit_reached' };
    }
    console.log('✅ Allowance available\n');
    
    // Step 5: Claim tokens
    console.log('5️⃣ Claiming tokens...');
    const result = await freactFaucetService.claimTokens(USER_ADDRESS);
    console.log('✅ Claim successful!');
    console.log(`   Amount: ${result.amount} FREACT`);
    console.log(`   TX: ${result.txHash}\n`);
    
    // Step 6: Verify new balance
    console.log('6️⃣ Verifying new balance...');
    const newBalance = await freactFaucetService.getBalance(USER_ADDRESS);
    console.log(`   New balance: ${newBalance} FREACT`);
    console.log('✅ Balance updated\n');
    
    console.log('🎉 Claim flow completed successfully!');
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Claim flow failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Example 7: Get Claim History
 */
async function getClaimHistory() {
  try {
    await freactFaucetService.initialize(FREACT_CONTRACT_ADDRESS);
    
    const history = await freactFaucetService.getClaimHistory(USER_ADDRESS);
    
    console.log('Claim History:', {
      totalClaims: history.claimCount,
      totalAmount: history.totalClaimed + ' FREACT',
      lastClaimDate: history.lastClaim > 0 
        ? new Date(history.lastClaim * 1000).toLocaleString()
        : 'Never claimed'
    });
    
    return history;
  } catch (error) {
    console.error('Failed to get claim history:', error);
  }
}

// Export examples
export {
  checkUserStatus,
  claimTokens,
  checkNextClaimTime,
  getFaucetStats,
  monitorBalance,
  completeClaimFlow,
  getClaimHistory
};

// Example usage in console:
// import * as examples from './FREACTFaucetExample.js';
// await examples.completeClaimFlow();
