<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { simulationPortfolios, updatePortfolioSettings, updateTokenSettings } from '$lib/stores/simulation.js';
	import { INITIAL_TOKEN_LIST } from '$lib/config/network.js';

	// Get portfolio name from URL
	$: portfolioName = $page.params.name;
	$: portfolio = $simulationPortfolios[portfolioName];

	// Settings state (global defaults - legacy)
	let sellPercent = 10; // Sell when price increases by this %
	let buyPercent = 5; // Buy when price decreases by this %
	let stopLossPercent = 15; // Stop loss when price decreases by this %
	let autoBalanceEnabled = false;

	// Token allocations (percentages)
	let allocations = {}; // { symbol: percentage }
	
	// Per-token settings
	let tokenSettings = {}; // { symbol: { sellPercent, buyPercent, stopLossPercent, enabled } }
	
	// UI state
	let isSaving = false;
	let error = '';
	let success = '';

	// Calculated values
	$: totalPercentage = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
	$: remainingPercentage = 100 - totalPercentage;
	$: isValid = Math.abs(totalPercentage - 100) < 0.01;
	$: selectedTokens = Object.keys(allocations).filter(symbol => allocations[symbol] > 0);

	// Dynamic validation for all inputs
	$: isFormComplete = (() => {
		// Check if basic trading settings have valid values
		const hasValidTradingSettings = 
			sellPercent > 0 && sellPercent <= 100 &&
			buyPercent > 0 && buyPercent <= 50 &&
			stopLossPercent > 0 && stopLossPercent <= 50;

		// Check if we have at least one token with allocation
		const hasTokenAllocations = selectedTokens.length > 0;

		// Check if all token allocations are valid (> 0 and <= 100)
		const hasValidAllocations = selectedTokens.every(symbol => {
			const allocation = allocations[symbol];
			return allocation > 0 && allocation <= 100;
		});

		// Check if all token-specific settings are valid
		const hasValidTokenSettings = selectedTokens.every(symbol => {
			const settings = tokenSettings[symbol];
			if (!settings) return false;
			
			return (
				settings.sellPercent > 0 && settings.sellPercent <= 100 &&
				settings.buyPercent > 0 && settings.buyPercent <= 50 &&
				settings.stopLossPercent > 0 && settings.stopLossPercent <= 50
			);
		});

		// Check if total percentage equals 100%
		const hasValidTotal = isValid;

		return hasValidTradingSettings && hasTokenAllocations && hasValidAllocations && hasValidTokenSettings && hasValidTotal;
	})();

	// Only show tokens that are already configured in the portfolio
	$: configuredTokens = selectedTokens.map(symbol => {
		// Find the token in the INITIAL_TOKEN_LIST
		return INITIAL_TOKEN_LIST.find(token => token.symbol === symbol) || {
			symbol,
			name: symbol, // fallback if not found in list
			category: 'unknown'
		};
	});

	onMount(() => {
		if (!portfolio) {
			error = 'Portfolio not found';
			return;
		}

		// Priority 1: Load from portfolio.settings if available
		if (portfolio.settings) {
			sellPercent = portfolio.settings.sellPercent || 10;
			buyPercent = portfolio.settings.buyPercent || 5;
			stopLossPercent = portfolio.settings.stopLossPercent || 15;
			autoBalanceEnabled = portfolio.settings.autoBalanceEnabled || false;
			
			if (portfolio.settings.allocations && Object.keys(portfolio.settings.allocations).length > 0) {
				allocations = { ...portfolio.settings.allocations };
				console.log('📊 Loaded allocations from portfolio settings:', allocations);
			}
			
			// Load per-token settings
			if (portfolio.settings.tokenSettings && Object.keys(portfolio.settings.tokenSettings).length > 0) {
				tokenSettings = { ...portfolio.settings.tokenSettings };
				console.log('⚙️ Loaded per-token settings:', tokenSettings);
			}
		}

		// Priority 2: Load existing settings if portfolio has holdings
		if (portfolio.holdings && Object.keys(portfolio.holdings).length > 0) {
			// Calculate current percentages from holdings
			const totalValue = portfolio.currentValue;
			const newAllocations = {};
			
			for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
				const holdingValue = holding.amount * holding.currentPrice;
				newAllocations[symbol] = (holdingValue / totalValue) * 100;
				
				// Initialize per-token settings if not already set
				if (!tokenSettings[symbol]) {
					tokenSettings[symbol] = {
						targetPercentage: newAllocations[symbol],
						sellPercent: sellPercent,
						buyPercent: buyPercent,
						stopLossPercent: stopLossPercent,
						lastPrice: holding.currentPrice,
						enabled: true
					};
				}
			}
			
			allocations = newAllocations;
			console.log('📊 Loaded portfolio allocations from holdings:', allocations);
		}

		// Priority 3: Load saved settings from localStorage (legacy support)
		const savedSettings = localStorage.getItem(`portfolio_settings_${portfolioName}`);
		if (savedSettings) {
			try {
				const settings = JSON.parse(savedSettings);
				sellPercent = settings.sellPercent || sellPercent;
				buyPercent = settings.buyPercent || buyPercent;
				stopLossPercent = settings.stopLossPercent || stopLossPercent;
				autoBalanceEnabled = settings.autoBalanceEnabled || autoBalanceEnabled;
				
				// If saved settings have allocations and we don't have any yet, use those
				if (settings.allocations && Object.keys(settings.allocations).length > 0 && Object.keys(allocations).length === 0) {
					allocations = settings.allocations;
					console.log('📊 Loaded saved allocations from localStorage:', allocations);
				}
				
				// Load per-token settings from localStorage if available
				if (settings.tokenSettings && Object.keys(settings.tokenSettings).length > 0 && Object.keys(tokenSettings).length === 0) {
					tokenSettings = settings.tokenSettings;
					console.log('⚙️ Loaded per-token settings from localStorage:', tokenSettings);
				}
			} catch (err) {
				console.error('Failed to load saved settings:', err);
			}
		}
		
		// Initialize token settings for selected tokens that don't have settings yet
		for (const symbol of selectedTokens) {
			if (!tokenSettings[symbol]) {
				tokenSettings[symbol] = {
					targetPercentage: allocations[symbol] || 0,
					sellPercent: sellPercent,
					buyPercent: buyPercent,
					stopLossPercent: stopLossPercent,
					lastPrice: 0,
					enabled: true
				};
			}
		}
	});

	function handlePercentageChange(symbol, value) {
		const numValue = parseFloat(value) || 0;
		if (numValue < 0) return;
		if (numValue > 100) return;
		
		allocations = {
			...allocations,
			[symbol]: numValue
		};
		
		// Update target percentage in token settings
		if (tokenSettings[symbol]) {
			tokenSettings[symbol].targetPercentage = numValue;
		} else if (numValue > 0) {
			// Initialize token settings when allocation is set
			tokenSettings[symbol] = {
				targetPercentage: numValue,
				sellPercent: sellPercent,
				buyPercent: buyPercent,
				stopLossPercent: stopLossPercent,
				lastPrice: 0,
				enabled: true
			};
		}
	}
	
	function handleTokenSettingChange(symbol, field, value) {
		const numValue = parseFloat(value) || 0;
		if (numValue < 0) return;
		if (numValue > 100) return;
		
		if (!tokenSettings[symbol]) {
			tokenSettings[symbol] = {
				targetPercentage: allocations[symbol] || 0,
				sellPercent: sellPercent,
				buyPercent: buyPercent,
				stopLossPercent: stopLossPercent,
				lastPrice: 0,
				enabled: true
			};
		}
		
		tokenSettings = {
			...tokenSettings,
			[symbol]: {
				...tokenSettings[symbol],
				[field]: numValue
			}
		};
	}
	
	function toggleTokenEnabled(symbol) {
		if (!tokenSettings[symbol]) {
			tokenSettings[symbol] = {
				targetPercentage: allocations[symbol] || 0,
				sellPercent: sellPercent,
				buyPercent: buyPercent,
				stopLossPercent: stopLossPercent,
				lastPrice: 0,
				enabled: true
			};
		}
		
		tokenSettings = {
			...tokenSettings,
			[symbol]: {
				...tokenSettings[symbol],
				enabled: !tokenSettings[symbol].enabled
			}
		};
	}

	function autoDistribute() {
		if (selectedTokens.length === 0) {
			error = 'Please select at least one token first';
			setTimeout(() => error = '', 3000);
			return;
		}

		const percentage = 100 / selectedTokens.length;
		const newAllocations = {};
		
		for (const symbol of selectedTokens) {
			newAllocations[symbol] = percentage;
			
			// Update token settings target percentage
			if (tokenSettings[symbol]) {
				tokenSettings[symbol].targetPercentage = percentage;
			} else {
				tokenSettings[symbol] = {
					targetPercentage: percentage,
					sellPercent: sellPercent,
					buyPercent: buyPercent,
					stopLossPercent: stopLossPercent,
					lastPrice: 0,
					enabled: true
				};
			}
		}

		allocations = newAllocations;
		tokenSettings = { ...tokenSettings }; // Trigger reactivity
		success = `Auto-distributed ${percentage.toFixed(2)}% to each token`;
		setTimeout(() => success = '', 3000);
	}

	function clearAll() {
		allocations = {};
		tokenSettings = {};
		success = 'All allocations cleared';
		setTimeout(() => success = '', 3000);
	}

	function saveSettings() {
		if (!isFormComplete) {
			// Provide specific error messages based on what's missing
			if (!isValid) {
				error = 'Total allocation must equal 100%';
			} else if (selectedTokens.length === 0) {
				error = 'Please configure at least one token allocation';
			} else if (sellPercent <= 0 || buyPercent <= 0 || stopLossPercent <= 0) {
				error = 'All trading percentages must be greater than 0';
			} else {
				error = 'Please complete all required fields';
			}
			return;
		}

		isSaving = true;
		error = '';
		success = '';

		try {
			// Prepare per-token settings for selected tokens
			const finalTokenSettings = {};
			for (const symbol of selectedTokens) {
				if (tokenSettings[symbol]) {
					finalTokenSettings[symbol] = {
						...tokenSettings[symbol],
						targetPercentage: allocations[symbol] || 0
					};
				} else {
					// Create default settings for tokens without explicit settings
					finalTokenSettings[symbol] = {
						targetPercentage: allocations[symbol] || 0,
						sellPercent: sellPercent,
						buyPercent: buyPercent,
						stopLossPercent: stopLossPercent,
						lastPrice: 0,
						enabled: true
					};
				}
			}
			
			// Save settings to portfolio store
			const settings = {
				sellPercent, // Global defaults (legacy)
				buyPercent,
				stopLossPercent,
				autoBalanceEnabled,
				allocations,
				tokenSettings: finalTokenSettings // Per-token settings
			};

			updatePortfolioSettings(portfolioName, settings);

			// Also save to localStorage for backward compatibility
			localStorage.setItem(`portfolio_settings_${portfolioName}`, JSON.stringify({
				...settings,
				updatedAt: Date.now()
			}));

			success = 'Settings saved successfully!';
			
			// Redirect back to portfolio after a short delay
			setTimeout(() => {
				goto(`/simulated/portfolio/${portfolioName}`);
			}, 1500);
		} catch (err) {
			console.error('Failed to save settings:', err);
			error = 'Failed to save settings. Please try again.';
		} finally {
			isSaving = false;
		}
	}


</script>

<svelte:head>
	<title>Portfolio Settings - {portfolioName}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						Portfolio Settings
					</h1>
					<p class="text-gray-600 dark:text-gray-300">
						{portfolioName}
					</p>
				</div>
				<button
					onclick={() => goto(`/simulated/portfolio/${portfolioName}`)}
					class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					← Back to Portfolio
				</button>
			</div>
		</div>

		{#if !portfolio}
			<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
				<p class="text-red-800 dark:text-red-200">Portfolio not found</p>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Messages -->
				{#if error}
					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
						<p class="text-red-800 dark:text-red-200">{error}</p>
					</div>
				{/if}

				{#if success}
					<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
						<p class="text-green-800 dark:text-green-200">{success}</p>
					</div>
				{/if}

				<!-- Trading Settings -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Trading Settings</h2>
					
					<div class="space-y-6">
						<!-- Sell Percentage -->
						<div>
							<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
								Sell % (Price Increase)
								<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
									Sell when price increases by this percentage
								</span>
							</label>
							<div class="flex items-center gap-4">
								<input
									type="range"
									min="1"
									max="100"
									step="1"
									bind:value={sellPercent}
									class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
								/>
								<div class="flex items-center gap-2 min-w-[100px]">
									<input
										type="number"
										min="1"
										max="100"
										step="1"
										bind:value={sellPercent}
										class="w-20 px-3 py-2 text-right rounded-lg border {sellPercent > 0 && sellPercent <= 100 ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
									/>
									<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
									{#if sellPercent > 0 && sellPercent <= 100}
										<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									{/if}
								</div>
							</div>
						</div>

						<!-- Buy Percentage -->
						<div>
							<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
								Buy % (Price Decrease)
								<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
									Buy when price decreases by this percentage
								</span>
							</label>
							<div class="flex items-center gap-4">
								<input
									type="range"
									min="1"
									max="50"
									step="1"
									bind:value={buyPercent}
									class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
								/>
								<div class="flex items-center gap-2 min-w-[100px]">
									<input
										type="number"
										min="1"
										max="50"
										step="1"
										bind:value={buyPercent}
										class="w-20 px-3 py-2 text-right rounded-lg border {buyPercent > 0 && buyPercent <= 50 ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
									/>
									<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
									{#if buyPercent > 0 && buyPercent <= 50}
										<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									{/if}
								</div>
							</div>
						</div>

						<!-- Stop Loss Percentage -->
						<div>
							<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
								Stop Loss % (Price Decrease)
								<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
									Convert to USDC when price decreases by this percentage
								</span>
							</label>
							<div class="flex items-center gap-4">
								<input
									type="range"
									min="1"
									max="50"
									step="1"
									bind:value={stopLossPercent}
									class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
								/>
								<div class="flex items-center gap-2 min-w-[100px]">
									<input
										type="number"
										min="1"
										max="50"
										step="1"
										bind:value={stopLossPercent}
										class="w-20 px-3 py-2 text-right rounded-lg border {stopLossPercent > 0 && stopLossPercent <= 50 ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
									/>
									<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
									{#if stopLossPercent > 0 && stopLossPercent <= 50}
										<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									{/if}
								</div>
							</div>
						</div>

						<!-- Auto Balance Toggle -->
						<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
							<div class="flex items-center justify-between">
								<div>
									<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
										Auto Balance
									</label>
									<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
										Automatically maintain token percentages by buying/selling
									</p>
								</div>
								<button
									onclick={() => autoBalanceEnabled = !autoBalanceEnabled}
									class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {autoBalanceEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
								>
									<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {autoBalanceEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Token Allocation Settings -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Token Allocation & Per-Token Settings</h2>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-600 dark:text-gray-300">
								Total: <span class="font-bold {isValid ? 'text-green-600' : 'text-red-600'}">{totalPercentage.toFixed(2)}%</span>
							</span>
							{#if !isValid}
								<span class="text-xs text-red-600 dark:text-red-400">
									(Remaining: {remainingPercentage.toFixed(2)}%)
								</span>
							{/if}
							{#if isFormComplete}
								<div class="flex items-center gap-1 text-green-600 dark:text-green-400">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
									<span class="text-xs font-medium">Ready to save</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Quick Actions -->
					{#if selectedTokens.length > 0}
						<div class="flex gap-2 mb-6">
							<button
								onclick={autoDistribute}
								class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
							>
								Auto Distribute
							</button>
							<button
								onclick={clearAll}
								class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
							>
								Clear All
							</button>
						</div>
					{/if}

					<!-- Configured Tokens Only -->
					{#if selectedTokens.length > 0}
						<div class="space-y-3">
							{#each configuredTokens as token}
								{@const hasAllocation = allocations[token.symbol] > 0}
								{@const settings = tokenSettings[token.symbol]}
								<div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-blue-500 dark:border-blue-400">
									<!-- Token Header with Allocation -->
									<div class="flex items-center gap-3 mb-3">
										<div class="flex-1 min-w-0">
											<p class="font-semibold text-gray-900 dark:text-white">
												{token.symbol}
											</p>
											<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
												{token.name}
											</p>
										</div>
										<div class="flex items-center gap-2">
											<label class="text-xs text-gray-600 dark:text-gray-400">Allocation:</label>
											<input
												type="number"
												min="0"
												max="100"
												step="1"
												value={allocations[token.symbol] || ''}
												oninput={(e) => handlePercentageChange(token.symbol, e.target.value)}
												placeholder="0"
												class="w-20 px-3 py-2 text-right rounded-lg border {allocations[token.symbol] > 0 ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
											/>
											<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
											{#if allocations[token.symbol] > 0}
												<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
												</svg>
											{/if}
										</div>
									</div>
									
									<!-- Per-Token Settings -->
									<div class="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
										<div class="flex items-center justify-between mb-3">
											<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Token-Specific Settings</h4>
											<button
												onclick={() => toggleTokenEnabled(token.symbol)}
												class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {settings?.enabled !== false ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}"
												title={settings?.enabled !== false ? 'Automation Enabled' : 'Automation Disabled'}
											>
												<span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {settings?.enabled !== false ? 'translate-x-5' : 'translate-x-1'}"></span>
											</button>
										</div>
										
										<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
											<!-- Sell % -->
											<div>
												<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
													Sell % ↑
												</label>
												<div class="flex items-center gap-1">
													<input
														type="number"
														min="1"
														max="100"
														step="1"
														value={settings?.sellPercent || sellPercent}
														oninput={(e) => handleTokenSettingChange(token.symbol, 'sellPercent', e.target.value)}
														class="w-full px-2 py-1 text-sm text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
													/>
													<span class="text-xs text-gray-500">%</span>
												</div>
											</div>
											
											<!-- Buy % -->
											<div>
												<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
													Buy % ↓
												</label>
												<div class="flex items-center gap-1">
													<input
														type="number"
														min="1"
														max="50"
														step="1"
														value={settings?.buyPercent || buyPercent}
														oninput={(e) => handleTokenSettingChange(token.symbol, 'buyPercent', e.target.value)}
														class="w-full px-2 py-1 text-sm text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
													/>
													<span class="text-xs text-gray-500">%</span>
												</div>
											</div>
											
											<!-- Stop Loss % -->
											<div>
												<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
													Stop Loss % ↓
												</label>
												<div class="flex items-center gap-1">
													<input
														type="number"
														min="1"
														max="50"
														step="1"
														value={settings?.stopLossPercent || stopLossPercent}
														oninput={(e) => handleTokenSettingChange(token.symbol, 'stopLossPercent', e.target.value)}
														class="w-full px-2 py-1 text-sm text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
													/>
													<span class="text-xs text-gray-500">%</span>
												</div>
											</div>
										</div>
										
										<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
											{#if settings?.enabled !== false}
												✓ Automation active for this token
											{:else}
												⚠ Automation disabled for this token
											{/if}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8">
							<div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
								<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
							</div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No tokens configured</h3>
							<p class="text-gray-500 dark:text-gray-400 mb-4">
								This portfolio doesn't have any token allocations set up yet.
							</p>
							<p class="text-sm text-gray-400 dark:text-gray-500">
								Token allocations are typically set during the initial portfolio setup process.
							</p>
						</div>
					{/if}
				</div>

				<!-- Save Button -->
				<div class="flex items-center gap-3">
					<button
						onclick={saveSettings}
						disabled={isSaving || !isFormComplete}
						class="flex-1 px-6 py-3 rounded-lg font-semibold transition-all transform bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
					>
						{#if isSaving}
							<span class="flex items-center justify-center gap-2">
								<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Saving...
							</span>
						{:else}
							Upload Settings
						{/if}
					</button>
				</div>

				<!-- Info Box -->
				<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<div class="flex gap-2">
						<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="text-xs text-blue-900 dark:text-blue-100">
							<p class="font-medium mb-1">Portfolio Trading Settings</p>
							<p class="text-blue-700 dark:text-blue-300">
								Configure trading parameters for your portfolio tokens. Adjust allocation percentages (must total 100%) and customize sell%, buy%, and stop-loss% for each token. Use the toggle to enable/disable automation per token.
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
