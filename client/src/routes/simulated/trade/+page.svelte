<script>
	import { simulationBuy, simulationSell, simulationPortfolio, simulationSummary } from '$lib/stores/simulation';
	import { globalPricesStore } from '$lib/stores/globalStorage.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';
	import { goto } from '$app/navigation';

	let tradeType = 'buy'; // 'buy' or 'sell'
	let selectedToken = INITIAL_TOKEN_LIST[0];
	let amount = '';
	let loading = false;
	let error = '';
	let success = '';

	$: currentPrice = $globalPricesStore[selectedToken?.address]?.price || 0;
	$: tokenAmount = tradeType === 'buy' && amount && currentPrice 
		? (parseFloat(amount) / currentPrice).toFixed(6)
		: amount;
	$: usdValue = tradeType === 'sell' && amount && currentPrice
		? (parseFloat(amount) * currentPrice).toFixed(2)
		: amount;

	$: holding = $simulationSummary?.holdings.find(h => h.symbol === selectedToken?.symbol);
	$: maxSellAmount = holding?.amount || 0;
	$: maxBuyAmount = $simulationPortfolio?.balance || 0;

	async function handleTrade() {
		error = '';
		success = '';
		loading = true;

		try {
			if (!amount || parseFloat(amount) <= 0) {
				throw new Error('Please enter a valid amount');
			}

			if (tradeType === 'buy') {
				const usdAmount = parseFloat(amount);
				if (usdAmount > maxBuyAmount) {
					throw new Error('Insufficient balance');
				}

				const result = await simulationBuy(selectedToken.symbol, usdAmount, currentPrice);
				success = `Bought ${result.tokenAmount.toFixed(6)} ${selectedToken.symbol} for $${usdAmount.toFixed(2)}`;
			} else {
				const tokenAmt = parseFloat(amount);
				if (tokenAmt > maxSellAmount) {
					throw new Error('Insufficient tokens');
				}

				const result = await simulationSell(selectedToken.symbol, tokenAmt, currentPrice);
				const plText = result.profitLoss >= 0 
					? `+$${result.profitLoss.toFixed(2)} profit`
					: `-$${Math.abs(result.profitLoss).toFixed(2)} loss`;
				success = `Sold ${tokenAmt.toFixed(6)} ${selectedToken.symbol} for $${result.usdAmount.toFixed(2)} (${plText})`;
			}

			amount = '';
			
			// Redirect to dashboard after 2 seconds
			setTimeout(() => {
				goto('/simulated/dashboard');
			}, 2000);

		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function setMaxAmount() {
		if (tradeType === 'buy') {
			amount = maxBuyAmount.toFixed(2);
		} else {
			amount = maxSellAmount.toFixed(6);
		}
	}
</script>

<svelte:head>
	<title>Trade - Simulation Mode</title>
</svelte:head>

<div class="trade-page">
	<div class="container">
		<h1>💱 Trade</h1>

		<div class="trade-card">
			<!-- Trade Type Selector -->
			<div class="trade-type-selector">
				<button 
					class="type-btn" 
					class:active={tradeType === 'buy'}
					onclick={() => { tradeType = 'buy'; amount = ''; }}
				>
					Buy
				</button>
				<button 
					class="type-btn" 
					class:active={tradeType === 'sell'}
					onclick={() => { tradeType = 'sell'; amount = ''; }}
				>
					Sell
				</button>
			</div>

			<!-- Token Selector -->
			<div class="form-group">
				<label>Token</label>
				<select bind:value={selectedToken}>
					{#each INITIAL_TOKEN_LIST as token}
						<option value={token}>{token.symbol} - {token.name}</option>
					{/each}
				</select>
			</div>

			<!-- Current Price -->
			<div class="price-display">
				<span class="label">Current Price:</span>
				<span class="value">${currentPrice.toFixed(6)}</span>
			</div>

			<!-- Amount Input -->
			<div class="form-group">
				<label>
					{tradeType === 'buy' ? 'Amount (USD)' : 'Amount (Tokens)'}
				</label>
				<div class="input-with-max">
					<input 
						type="number" 
						bind:value={amount}
						placeholder={tradeType === 'buy' ? '0.00' : '0.000000'}
						step={tradeType === 'buy' ? '0.01' : '0.000001'}
					/>
					<button class="max-btn" onclick={setMaxAmount}>MAX</button>
				</div>
				<div class="input-hint">
					{#if tradeType === 'buy'}
						Available: ${maxBuyAmount.toFixed(2)}
						{#if amount && currentPrice}
							<br/>You'll receive: ~{tokenAmount} {selectedToken.symbol}
						{/if}
					{:else}
						Available: {maxSellAmount.toFixed(6)} {selectedToken.symbol}
						{#if amount && currentPrice}
							<br/>You'll receive: ~${usdValue}
						{/if}
					{/if}
				</div>
			</div>

			<!-- Holding Info (for sell) -->
			{#if tradeType === 'sell' && holding}
				<div class="holding-info">
					<div class="info-row">
						<span>Your Holdings:</span>
						<span>{holding.amount.toFixed(6)} {selectedToken.symbol}</span>
					</div>
					<div class="info-row">
						<span>Avg Buy Price:</span>
						<span>${holding.avgBuyPrice.toFixed(2)}</span>
					</div>
					<div class="info-row">
						<span>Current Value:</span>
						<span>${holding.currentValue.toFixed(2)}</span>
					</div>
					<div class="info-row">
						<span>Unrealized P/L:</span>
						<span class:profit={holding.profitLoss >= 0} class:loss={holding.profitLoss < 0}>
							{holding.profitLoss >= 0 ? '+' : ''}{holding.profitLoss.toFixed(2)} 
							({holding.profitLossPercent.toFixed(2)}%)
						</span>
					</div>
				</div>
			{/if}

			<!-- Error/Success Messages -->
			{#if error}
				<div class="message error">{error}</div>
			{/if}
			{#if success}
				<div class="message success">{success}</div>
			{/if}

			<!-- Trade Button -->
			<button 
				class="trade-btn" 
				class:buy={tradeType === 'buy'}
				class:sell={tradeType === 'sell'}
				onclick={handleTrade}
				disabled={loading || !amount}
			>
				{loading ? 'Processing...' : tradeType === 'buy' ? 'Buy' : 'Sell'}
			</button>

			<a href="/simulated/dashboard" class="back-link">← Back to Dashboard</a>
		</div>
	</div>
</div>

<style>
	.trade-page {
		padding: 2rem;
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		margin-bottom: 1.5rem;
		font-size: 2rem;
	}

	.trade-card {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.trade-type-selector {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.type-btn {
		padding: 0.75rem;
		border: 2px solid #e0e0e0;
		border-radius: 0.5rem;
		background: white;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.type-btn.active {
		border-color: #667eea;
		background: #667eea;
		color: white;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	select, input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 0.5rem;
		font-size: 1rem;
	}

	.input-with-max {
		display: flex;
		gap: 0.5rem;
	}

	.input-with-max input {
		flex: 1;
	}

	.max-btn {
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.max-btn:hover {
		background: #e9ecef;
	}

	.input-hint {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #666;
	}

	.price-display {
		display: flex;
		justify-content: space-between;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.price-display .label {
		color: #666;
	}

	.price-display .value {
		font-weight: 700;
		color: #333;
	}

	.holding-info {
		background: #f8f9fa;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #e0e0e0;
	}

	.info-row:last-child {
		border-bottom: none;
	}

	.profit {
		color: #10b981;
		font-weight: 600;
	}

	.loss {
		color: #ef4444;
		font-weight: 600;
	}

	.message {
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.message.error {
		background: #fee2e2;
		color: #991b1b;
	}

	.message.success {
		background: #d1fae5;
		color: #065f46;
	}

	.trade-btn {
		width: 100%;
		padding: 1rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: 1rem;
	}

	.trade-btn.buy {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
	}

	.trade-btn.sell {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.trade-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.trade-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.back-link {
		display: block;
		text-align: center;
		color: #667eea;
		text-decoration: none;
		font-weight: 600;
	}

	.back-link:hover {
		text-decoration: underline;
	}
</style>
