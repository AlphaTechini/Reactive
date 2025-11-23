<script>
	import { goto } from '$app/navigation';
	import { wallet } from '$lib/stores/wallet';

	function navigateTo(path) {
		goto(`/simulated${path}`);
	}
</script>

<div class="simulated-home">
	<div class="container">
		<h1>🧪 Simulation Mode</h1>
		<p class="subtitle">Test portfolio features with local Hardhat network</p>

		<div class="info-card">
			<h3>📍 Network Info</h3>
			<div class="info-grid">
				<div class="info-item">
					<span class="label">Network:</span>
					<span class="value">Hardhat Local</span>
				</div>
				<div class="info-item">
					<span class="label">Chain ID:</span>
					<span class="value">1337</span>
				</div>
				<div class="info-item">
					<span class="label">RPC:</span>
					<span class="value">http://127.0.0.1:8545</span>
				</div>
			</div>
		</div>

		<div class="features">
			<h3>Available Features</h3>
			<div class="feature-grid">
				<button class="feature-card" onclick={() => navigateTo('/dashboard')}>
					<div class="icon">📊</div>
					<h4>Dashboard</h4>
					<p>View your simulated portfolios</p>
				</button>

				<button class="feature-card" onclick={() => navigateTo('/create-portfolio')}>
					<div class="icon">➕</div>
					<h4>Create Portfolio</h4>
					<p>Test portfolio creation</p>
				</button>

				<button class="feature-card" onclick={() => navigateTo('/faucet')}>
					<div class="icon">🚰</div>
					<h4>FREACT Faucet</h4>
					<p>Get test tokens</p>
				</button>

				<button class="feature-card" onclick={() => navigateTo('/portfolios')}>
					<div class="icon">📁</div>
					<h4>All Portfolios</h4>
					<p>Browse all test portfolios</p>
				</button>
			</div>
		</div>

		<div class="setup-guide">
			<h3>🚀 Quick Setup</h3>
			<ol>
				<li>Start Hardhat node: <code>npx hardhat node</code></li>
				<li>Deploy contracts: <code>npx hardhat run scripts/deploy-local.js --network localhost</code></li>
				<li>Connect MetaMask to localhost:8545</li>
				<li>Import a Hardhat test account</li>
				<li>Start testing!</li>
			</ol>
		</div>
	</div>
</div>

<style>
	.simulated-home {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		font-size: 1.125rem;
		color: #666;
		margin: 0.5rem 0 0 0;
	}

	.info-card {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.info-card h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
	}

	.info-grid {
		display: grid;
		gap: 1rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 0.5rem;
	}

	.label {
		font-weight: 600;
		color: #666;
	}

	.value {
		font-family: monospace;
		color: #333;
	}

	.features h3 {
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.feature-card {
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 1rem;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.feature-card:hover {
		border-color: #667eea;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
	}

	.icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.feature-card h4 {
		margin: 0.5rem 0;
		font-size: 1.125rem;
	}

	.feature-card p {
		margin: 0;
		color: #666;
		font-size: 0.875rem;
	}

	.setup-guide {
		background: #f8f9fa;
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.setup-guide h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
	}

	.setup-guide ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.setup-guide li {
		margin: 0.5rem 0;
		line-height: 1.6;
	}

	code {
		background: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875rem;
		border: 1px solid #e0e0e0;
	}
</style>
