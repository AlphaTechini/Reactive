<script>
  import FaucetWidget from '$lib/components/FaucetWidget.svelte';
  import { walletStore } from '$lib/stores/wallet.js';
  import { onMount } from 'svelte';

  // Get FREACT contract address from environment
  const FREACT_CONTRACT_ADDRESS = import.meta.env.VITE_FREACT_CONTRACT_ADDRESS || '';

  let faucetStats = null;

  $: isConnected = $walletStore.isConnected;
</script>

<svelte:head>
  <title>FREACT Faucet - Get Test Tokens</title>
</svelte:head>

<div class="faucet-page">
  <div class="container">
    <header class="page-header">
      <h1>🎁 FREACT Faucet</h1>
      <p class="subtitle">Get free test tokens to try out the portfolio manager</p>
    </header>

    <div class="content-grid">
      <!-- Main Faucet Widget -->
      <div class="main-section">
        <FaucetWidget contractAddress={FREACT_CONTRACT_ADDRESS} />
      </div>

      <!-- Information Sidebar -->
      <div class="info-section">
        <div class="info-card">
          <h3>📖 How it Works</h3>
          <ol>
            <li>
              <strong>Connect Wallet</strong>
              <p>Connect your MetaMask wallet to the Reactive Lasna Testnet</p>
            </li>
            <li>
              <strong>Get Gas Tokens</strong>
              <p>You need testnet REACT for gas fees. Get them from the Reactive faucet.</p>
            </li>
            <li>
              <strong>Claim FREACT</strong>
              <p>Click the claim button to receive 1,000 FREACT tokens (= $1,000 USD)</p>
            </li>
            <li>
              <strong>Build Portfolios</strong>
              <p>Use your FREACT to test portfolio management features</p>
            </li>
          </ol>
        </div>

        <div class="info-card">
          <h3>ℹ️ Faucet Rules</h3>
          <ul>
            <li><strong>1,000 FREACT</strong> per claim</li>
            <li><strong>24 hour</strong> cooldown between claims</li>
            <li><strong>10,000 FREACT</strong> maximum per address</li>
            <li><strong>1 FREACT = $1 USD</strong> for easy calculations</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>🔗 Useful Links</h3>
          <div class="links">
            <a href="https://lasna.reactscan.net/faucet" target="_blank" rel="noopener noreferrer" class="link-item">
              <span class="link-icon">⛽</span>
              <div>
                <div class="link-title">Get REACT Tokens</div>
                <div class="link-desc">For gas fees</div>
              </div>
            </a>
            <a href="https://lasna.reactscan.net/" target="_blank" rel="noopener noreferrer" class="link-item">
              <span class="link-icon">🔍</span>
              <div>
                <div class="link-title">Block Explorer</div>
                <div class="link-desc">View transactions</div>
              </div>
            </a>
            <a href="/create-portfolio" class="link-item">
              <span class="link-icon">📊</span>
              <div>
                <div class="link-title">Create Portfolio</div>
                <div class="link-desc">Start building</div>
              </div>
            </a>
          </div>
        </div>

        <div class="info-card highlight">
          <h3>💡 Pro Tip</h3>
          <p>
            FREACT is pegged to $1 USD in this simulation mode. This makes it easy to 
            understand your portfolio value and test realistic scenarios without using real money!
          </p>
        </div>
      </div>
    </div>

    {#if !isConnected}
      <div class="connection-prompt">
        <div class="prompt-content">
          <span class="prompt-icon">🔌</span>
          <div>
            <h3>Connect Your Wallet</h3>
            <p>Connect to the Reactive Lasna Testnet to start claiming tokens</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .faucet-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    padding: 40px 20px;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    text-align: center;
    margin-bottom: 48px;
    color: white;
  }

  .page-header h1 {
    font-size: 48px;
    margin: 0 0 16px 0;
    font-weight: bold;
  }

  .subtitle {
    font-size: 20px;
    opacity: 0.9;
    margin: 0;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 32px;
    margin-bottom: 32px;
  }

  .main-section {
    min-height: 400px;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .info-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .info-card.highlight {
    background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
    color: white;
  }

  .info-card h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: bold;
  }

  .info-card ol,
  .info-card ul {
    margin: 0;
    padding-left: 20px;
  }

  .info-card li {
    margin-bottom: 16px;
  }

  .info-card li:last-child {
    margin-bottom: 0;
  }

  .info-card li strong {
    display: block;
    margin-bottom: 4px;
    color: #667eea;
  }

  .info-card.highlight li strong {
    color: white;
  }

  .info-card li p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
  }

  .link-item:hover {
    background: #e0e0e0;
    transform: translateX(4px);
  }

  .link-icon {
    font-size: 24px;
  }

  .link-title {
    font-weight: bold;
    font-size: 14px;
  }

  .link-desc {
    font-size: 12px;
    opacity: 0.7;
  }

  .connection-prompt {
    background: rgba(255, 255, 255, 0.1);
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    color: white;
  }

  .prompt-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .prompt-icon {
    font-size: 48px;
  }

  .prompt-content h3 {
    margin: 0 0 8px 0;
    font-size: 24px;
  }

  .prompt-content p {
    margin: 0;
    opacity: 0.9;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .info-section {
      order: 2;
    }

    .main-section {
      order: 1;
    }
  }

  @media (max-width: 640px) {
    .page-header h1 {
      font-size: 36px;
    }

    .subtitle {
      font-size: 16px;
    }

    .faucet-page {
      padding: 20px 16px;
    }

    .prompt-content {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
