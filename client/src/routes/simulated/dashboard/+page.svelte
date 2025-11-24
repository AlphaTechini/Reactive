<script>
	import { onMount } from 'svelte';
	import { 
		simulationBalance, 
		simulationPortfolios, 
		totalPortfolioValue,
		overallProfitLoss,
		portfolioCount,
		updatePortfolioPrices,
		startPriceUpdates
	} from '$lib/stores/simulation';
	import { globalPricesStore } from '$lib/stores/globalStorage.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import priceService from '$lib/priceService.js';

	// Initialize price updates on mount
	onMount(async () => {
		// Ensure price service is initialized
		if (!priceService.isInitialized) {
			await priceService.initialize();
		}
		
		// Start price updates for all portfolios
		startPriceUpdates();
	});

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
		// Update portfolio prices
		if (Object.keys(prices).length > 0) {
			updatePortfolioPrices(prices);
		}
	}

	// Convert portfolios object to array for easier iteration
	$: portfolioList = Object.values($simulationPortfolios || {});
	
	// Format currency
	function formatCurrency(value) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}
	
	// Format date
	function formatDate(timestamp) {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Dashboard - Simulation Mode</title>
</svelte:head>

<div class="simulation-dashboard">
	<div class="container">
		<!-- Account Summary -->
		<div class="summary-card">
			<h2>📊 Account Summary</h2>
			<div class="summary-grid">
				<div class="summary-item">
					<span class="label">Available Balance</span>
					<span class="value">{formatCurrency($simulationBalance)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Total Portfolio Value</span>
					<span class="value">{formatCurrency($totalPortfolioValue)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Total Account Value</span>
					<span class="value">{formatCurrency($simulationBalance + $totalPortfolioValue)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Overall P/L</span>
					<span class="value" class:profit={$overallProfitLoss.absolute >= 0} class:loss={$overallProfitLoss.absolute < 0}>
						{$overallProfitLoss.absolute >= 0 ? '+' : ''}{formatCurrency($overallProfitLoss.absolute)}
						({$overallProfitLoss.percentage.toFixed(2)}%)
					</span>
				</div>
			</div>
		</div>

		<!-- Portfolios Section -->
		<div class="portfolios-section">
			<div class="section-header">
				<h2>💼 My Portfolios ({$portfolioCount})</h2>
				<a href="/simulated/create-portfolio" class="create-btn">
					<span class="icon">➕</span>
					<span>Create Portfolio</span>
				</a>
			</div>

			{#if portfolioList.length === 0}
				<div class="empty-state-card">
					<div class="empty-icon">📂</div>
					<h3>No Portfolios Yet</h3>
					<p>Create your first portfolio to start managing your investments</p>
					<a href="/simulated/create-portfolio" class="empty-action-btn">
						Create Portfolio
					</a>
				</div>
			{:else}
				<div class="portfolio-grid">
					{#each portfolioList as portfolio}
						<a href="/simulated/portfolio/{encodeURIComponent(portfolio.name)}" class="portfolio-card">
							<div class="portfolio-header">
								<h3 class="portfolio-name">{portfolio.name}</h3>
								<span class="portfolio-date">{formatDate(portfolio.createdAt)}</span>
							</div>
							
							{#if portfolio.description}
								<p class="portfolio-description">{portfolio.description}</p>
							{/if}
							
							<div class="portfolio-stats">
								<div class="stat">
									<span class="stat-label">Current Value</span>
									<span class="stat-value">{formatCurrency(portfolio.currentValue)}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Initial Deposit</span>
									<span class="stat-value">{formatCurrency(portfolio.initialDeposit)}</span>
								</div>
							</div>
							
							<div class="portfolio-pl">
								<span class="pl-label">Profit/Loss</span>
								<span class="pl-value" class:profit={portfolio.profitLoss.absolute >= 0} class:loss={portfolio.profitLoss.absolute < 0}>
									{portfolio.profitLoss.absolute >= 0 ? '+' : ''}{formatCurrency(portfolio.profitLoss.absolute)}
									<span class="pl-percent">({portfolio.profitLoss.percentage.toFixed(2)}%)</span>
								</span>
							</div>
							
							<div class="portfolio-holdings">
								<span class="holdings-count">
									{Object.keys(portfolio.holdings).length} {Object.keys(portfolio.holdings).length === 1 ? 'Token' : 'Tokens'}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.simulation-dashboard {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Summary Card */
	.summary-card {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

	/* Portfolios Section */
	.portfolios-section {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.create-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
	}

	.create-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.create-btn .icon {
		font-size: 1.25rem;
	}

	/* Empty State */
	.empty-state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		background: #f8f9fa;
		border-radius: 0.75rem;
		border: 2px dashed #e0e0e0;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		color: #333;
	}

	.empty-state-card p {
		margin: 0 0 1.5rem 0;
		color: #666;
		font-size: 1rem;
	}

	.empty-action-btn {
		padding: 0.75rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s;
	}

	.empty-action-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	/* Portfolio Grid */
	.portfolio-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	/* Portfolio Card */
	.portfolio-card {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 0.75rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
		cursor: pointer;
	}

	.portfolio-card:hover {
		border-color: #667eea;
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
	}

	.portfolio-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.portfolio-name {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #333;
		word-break: break-word;
	}

	.portfolio-date {
		font-size: 0.75rem;
		color: #999;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.portfolio-description {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.portfolio-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #666;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		color: #333;
	}

	.portfolio-pl {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.pl-label {
		font-size: 0.875rem;
		color: #666;
		font-weight: 500;
	}

	.pl-value {
		font-size: 1rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pl-percent {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.portfolio-holdings {
		display: flex;
		justify-content: flex-end;
	}

	.holdings-count {
		font-size: 0.875rem;
		color: #666;
		padding: 0.25rem 0.75rem;
		background: #f0f0f0;
		border-radius: 1rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.simulation-dashboard {
			padding: 1rem;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.portfolio-grid {
			grid-template-columns: 1fr;
		}

		.section-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.create-btn {
			justify-content: center;
		}
	}
</style>
