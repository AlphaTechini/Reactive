<script>
  import { onMount, onDestroy } from 'svelte';
  import { walletStore } from '../stores/wallet.js';
  import { freactFaucetService } from '../services/FREACTFaucetService.js';

  // Props
  export let contractAddress = '';
  export let compact = false;

  // State
  let loading = true;
  let claiming = false;
  let error = null;
  let success = null;
  let userStatus = null;
  let countdown = 0;
  let countdownInterval = null;

  // Reactive
  $: isConnected = $walletStore.isConnected;
  $: userAddress = $walletStore.address;

  onMount(async () => {
    if (contractAddress && isConnected) {
      await initializeFaucet();
    }
  });

  onDestroy(() => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  });

  async function initializeFaucet() {
    try {
      loading = true;
      error = null;

      await freactFaucetService.initialize(contractAddress);
      await loadUserStatus();

      // Start countdown if needed
      if (userStatus && !userStatus.canClaim && userStatus.nextClaimTime.timeUntilClaim > 0) {
        startCountdown(userStatus.nextClaimTime.timeUntilClaim);
      }
    } catch (err) {
      console.error('Failed to initialize faucet:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadUserStatus() {
    if (!userAddress) return;

    try {
      userStatus = await freactFaucetService.getUserStatus(userAddress);
    } catch (err) {
      console.error('Failed to load user status:', err);
      throw err;
    }
  }

  async function handleClaim() {
    if (!userAddress) {
      error = 'Please connect your wallet first';
      return;
    }

    try {
      claiming = true;
      error = null;
      success = null;

      const result = await freactFaucetService.claimTokens(userAddress);

      success = `Successfully claimed ${result.amount} FREACT! 🎉`;
      
      // Reload status after claim
      setTimeout(async () => {
        await loadUserStatus();
        if (userStatus && userStatus.nextClaimTime.timeUntilClaim > 0) {
          startCountdown(userStatus.nextClaimTime.timeUntilClaim);
        }
      }, 2000);

    } catch (err) {
      console.error('Claim failed:', err);
      error = err.message || 'Failed to claim tokens';
    } finally {
      claiming = false;
    }
  }

  function startCountdown(seconds) {
    countdown = seconds;
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        loadUserStatus(); // Refresh status when countdown ends
      }
    }, 1000);
  }

  function openReactFaucet() {
    window.open(freactFaucetService.getReactFaucetUrl(), '_blank');
  }

  $: {
    if (isConnected && contractAddress && !loading) {
      loadUserStatus();
    }
  }
</script>

<div class="faucet-widget" class:compact>
  {#if !isConnected}
    <div class="status-message warning">
      <span class="icon">⚠️</span>
      <span>Connect your wallet to use the faucet</span>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading faucet...</span>
    </div>
  {:else if error}
    <div class="status-message error">
      <span class="icon">❌</span>
      <span>{error}</span>
    </div>
  {:else if success}
    <div class="status-message success">
      <span class="icon">✅</span>
      <span>{success}</span>
    </div>
  {/if}

  {#if userStatus && !loading}
    <div class="faucet-content">
      <!-- Balance Display -->
      <div class="balance-section">
        <div class="balance-item">
          <span class="label">FREACT Balance</span>
          <span class="value">{parseFloat(userStatus.freactBalance).toFixed(2)}</span>
        </div>
        <div class="balance-item">
          <span class="label">Gas Balance (REACT)</span>
          <span class="value" class:low={!userStatus.gasBalance.hasEnough}>
            {parseFloat(userStatus.gasBalance.balance).toFixed(4)}
          </span>
        </div>
      </div>

      <!-- Gas Warning -->
      {#if !userStatus.gasBalance.hasEnough}
        <div class="status-message warning">
          <span class="icon">⛽</span>
          <div class="warning-content">
            <p>You need testnet REACT for gas fees</p>
            <button class="link-button" on:click={openReactFaucet}>
              Get Free REACT →
            </button>
          </div>
        </div>
      {/if}

      <!-- Claim Section -->
      <div class="claim-section">
        {#if userStatus.canClaim && userStatus.gasBalance.hasEnough}
          <button 
            class="claim-button" 
            on:click={handleClaim}
            disabled={claiming || parseFloat(userStatus.remainingAllowance) === 0}
          >
            {#if claiming}
              <span class="spinner small"></span>
              Claiming...
            {:else}
              🎁 Claim 1,000 FREACT
            {/if}
          </button>
          <p class="claim-info">
            Remaining allowance: {parseFloat(userStatus.remainingAllowance).toFixed(0)} FREACT
          </p>
        {:else if parseFloat(userStatus.remainingAllowance) === 0}
          <div class="status-message info">
            <span class="icon">🎯</span>
            <span>You've reached the maximum claim limit (10,000 FREACT)</span>
          </div>
        {:else if countdown > 0}
          <div class="countdown-section">
            <p class="countdown-label">Next claim available in:</p>
            <div class="countdown-timer">
              {freactFaucetService.formatTimeRemaining(countdown)}
            </div>
          </div>
        {/if}
      </div>

      <!-- Claim History -->
      {#if userStatus.claimHistory.claimCount > 0 && !compact}
        <div class="history-section">
          <h4>Your Claim History</h4>
          <div class="history-stats">
            <div class="stat">
              <span class="stat-label">Total Claims</span>
              <span class="stat-value">{userStatus.claimHistory.claimCount}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total Claimed</span>
              <span class="stat-value">{parseFloat(userStatus.claimHistory.totalClaimed).toFixed(0)} FREACT</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .faucet-widget {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .faucet-widget.compact {
    padding: 16px;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: center;
    padding: 20px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .status-message.warning {
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.4);
  }

  .status-message.error {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.4);
  }

  .status-message.success {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
  }

  .status-message.info {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.4);
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .warning-content p {
    margin: 0;
  }

  .link-button {
    background: none;
    border: none;
    color: white;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    text-align: left;
    transition: opacity 0.2s;
  }

  .link-button:hover {
    opacity: 0.8;
  }

  .faucet-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .balance-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .balance-item {
    background: rgba(255, 255, 255, 0.1);
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .balance-item .label {
    font-size: 12px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .balance-item .value {
    font-size: 24px;
    font-weight: bold;
  }

  .balance-item .value.low {
    color: #ffeb3b;
  }

  .claim-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .claim-button {
    width: 100%;
    padding: 16px 24px;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 12px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .claim-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .claim-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .claim-info {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .countdown-section {
    text-align: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    width: 100%;
  }

  .countdown-label {
    font-size: 14px;
    opacity: 0.9;
    margin: 0 0 12px 0;
  }

  .countdown-timer {
    font-size: 32px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  .history-section {
    background: rgba(255, 255, 255, 0.1);
    padding: 16px;
    border-radius: 12px;
  }

  .history-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
  }

  .history-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    opacity: 0.8;
  }

  .stat-value {
    font-size: 18px;
    font-weight: bold;
  }

  @media (max-width: 640px) {
    .balance-section {
      grid-template-columns: 1fr;
    }

    .history-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
