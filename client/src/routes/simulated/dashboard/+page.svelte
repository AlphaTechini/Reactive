<script>
	import { onMount } from 'svelte';
	import { simulationPortfolio, simulationSummary, simulationPrices } from '$lib/stores/simulation';
	import { globalPricesStore } from '$lib/stores/globalStorage.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';

	let selectedToken = null;
	let timeframe = '1d';

	// Update simulation prices when global prices change
	$: if ($globalPricesStore) {
		// Convert price store format to simulation format
		const prices = {};
		for (const [address, data] of Object.entries($globalPricesStore)) {
			const token = INITIAL_TOKEN_LIST.find(t => t.address === address);
			if (token) {
				prices[token.symbol] = data.price;
			}
		}
		// Update simulation prices
		import('$lib/stores/simulation').then(({ updateSimulationPrices }) => {
			updateSimulationPrices(prices);
		});
	}

	onMount(() => {
		// Set default token
		selectedToken = INITIAL_TOKEN_LIST.find(t => t.symbol === 'ETH') || INITIAL_TOKEN_LIST[0];
	});

	$: summary = $simulationSummary || {
		balance: 0,
		totalValue: 0,
		profitLoss: 0,
		profitLossPercent: 0,
		holdings: []
	};
</script>

<svelte:head>
	<title>Dashboard - Simulation Mode</title>
</svelte:head>

<div class="simulation-dashboard">
	<div class="container">
		<!-- Portfolio Summary -->
		<div class="summary-card">
			<h2>📊 Portfolio Summary</h2>
			<div class="summary-grid">
				<div class="summary-item">
					<span class="label">Cash Balance</span>
					<span class="value">${summary.balance.toFixed(2)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Total Value</span>
					<span class="value">${summary.totalValue.toFixed(2)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Total Invested</span>
					<span class="value">${summary.totalInvested.toFixed(2)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Profit/Loss</span>
					<span class="value" class:profit={summary.profitLoss >= 0} class:loss={summary.profitLoss < 0}>
						{summary.profitLoss >= 0 ? '+' : ''}{summary.profitLoss.toFixed(2)} 
						({summary.profitLossPercent.toFixed(2)}%)
					</span>
				</div>
			</div>
		</div>

		<!-- Holdings -->
		<div class="holdings-card">
			<h2>💼 Holdings</h2>
			{#if summary.holdings.length === 0}
				<p class="empty-state">No holdings yet. Start trading to build your portfolio!</p>
			{:else}
				<div class="holdings-list">
					{#each summary.holdings as holding}
						<div class="holding-item">
							<div class="holding-header">
								<span class="symbol">{holding.symbol}</span>
								<span class="amount">{holding.amount.toFixed(6)} tokens</span>
							</div>
							<div class="holding-details">
								<div class="detail">
									<span class="detail-label">Avg Buy:</span>
									<span class="detail-value">${holding.avgBuyPrice.toFixed(2)}</span>
								</div>
								<div class="detail">
									<span class="detail-label">Current:</span>
									<span class="detail-value">${holding.currentPrice.toFixed(2)}</span>
								</div>
								<div class="detail">
									<span class="detail-label">Invested:</span>
									<span class="detail-value">${holding.totalInvested.toFixed(2)}</span>
								</div>
								<div class="detail">
									<span class="detail-label">Value:</span>
									<span class="detail-value">${holding.currentValue.toFixed(2)}</span>
								</div>
								<div class="detail">
									<span class="detail-label">P/L:</span>
									<span class="detail-value" class:profit={holding.profitLoss >= 0} class:loss={holding.profitLoss < 0}>
										{holding.profitLoss >= 0 ? '+' : ''}{holding.profitLoss.toFixed(2)} 
										({holding.profitLossPercent.toFixed(2)}%)
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="actions-card">
			<h2>⚡ Quick Actions</h2>
			<div class="action-buttons">
				<a href="/simulated/trade" class="action-btn primary">
					<span class="icon">💱</span>
					<span>Trade</span>
				</a>
				<a href="/simulated/deposit" class="action-btn">
					<span class="icon">💰</span>
					<span>Deposit</span>
				</a>
				<a href="/simulated/withdraw" class="action-btn">
					<span class="icon">🏦</span>
					<span>Withdraw</span>
				</a>
				<a href="/simulated/history" class="action-btn">
					<span class="icon">📜</span>
					<span>History</span>
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.simulation-dashboard {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.summary-card, .holdings-card, .actions-card {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 0.5rem;
	}

	.label {
		font-size: 0.875rem;
		color: #666;
		font-weight: 500;
	}

	.value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #333;
	}

	.profit {
		color: #10b981;
	}

	.loss {
		color: #ef4444;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.holdings-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.holding-item {
		border: 1px solid #e0e0e0;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.holding-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.symbol {
		font-size: 1.125rem;
		font-weight: 700;
		color: #333;
	}

	.amount {
		font-size: 0.875rem;
		color: #666;
	}

	.holding-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-label {
		font-size: 0.75rem;
		color: #666;
	}

	.detail-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.action-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		border: 2px solid #e0e0e0;
		border-radius: 0.75rem;
		text-decoration: none;
		color: #333;
		transition: all 0.2s;
	}

	.action-btn:hover {
		border-color: #667eea;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
	}

	.action-btn.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-color: transparent;
	}

	.icon {
		font-size: 2rem;
	}
</style>
