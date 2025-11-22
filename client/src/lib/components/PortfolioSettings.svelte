<script>
	import { onMount } from 'svelte';
	import { notify } from '$lib/notify.js';
	import { portfolioSettingsService } from '$lib/services/PortfolioSettingsService.js';
	import { portfolioContractService } from '$lib/services/PortfolioContractService.js';
	import { walletAddress } from '$lib/stores/wallet.js';
	
	// Props
	let { portfolioId, onSave = null } = $props();
	
	// Settings state
	let stopLossPercent = $state(10); // Default 10%
	let takeProfitPercent = $state(20); // Default 20%
	let autoBuyPercent = $state(5); // Default 5%
	let autoRebalanceEnabled = $state(false);
	let rebalanceThreshold = $state(5); // Default 5% drift
	
	// UI state
	let isSaving = $state(false);
	let isLoading = $state(true);
	let showAdvanced = $state(false);
	let isSyncingBlockchain = $state(false);
	let hasOnChainSettings = $state(false);
	
	// Advanced settings
	let trailingStopEnabled = $state(false);
	let trailingStopPercent = $state(5);
	let maxGasPercent = $state(2);
	let minTradeValue = $state(10);
	
	// Load settings on mount
	onMount(async () => {
		await loadSettings();
		await loadOnChainSettings();
	});
	
	async function loadSettings() {
		isLoading = true;
		
		try {
			// Load settings using the service
			const settings = portfolioSettingsService.loadSettings(portfolioId);
			
			// Basic settings
			stopLossPercent = settings.stopLossPercent;
			takeProfitPercent = settings.takeProfitPercent;
			autoBuyPercent = settings.autoBuyPercent;
			autoRebalanceEnabled = settings.autoRebalanceEnabled;
			rebalanceThreshold = settings.rebalanceThreshold;
			
			// Advanced settings
			trailingStopEnabled = settings.trailingStopEnabled;
			trailingStopPercent = settings.trailingStopPercent;
			maxGasPercent = settings.maxGasPercent;
			minTradeValue = settings.minTradeValue;
			
		} catch (error) {
			console.error('Error loading settings:', error);
			notify.error('Failed to load portfolio settings');
		} finally {
			isLoading = false;
		}
	}
	
	async function saveSettings() {
		isSaving = true;
		
		try {
			const settings = {
				stopLossPercent,
				takeProfitPercent,
				autoBuyPercent,
				autoRebalanceEnabled,
				rebalanceThreshold,
				trailingStopEnabled,
				trailingStopPercent,
				maxGasPercent,
				minTradeValue
			};
			
			// Save using the service (includes validation)
			const savedSettings = portfolioSettingsService.saveSettings(portfolioId, settings);
			
			notify.success('Portfolio settings saved successfully!');
			
			// Call onSave callback if provided
			if (onSave) {
				onSave(savedSettings);
			}
			
		} catch (error) {
			console.error('Error saving settings:', error);
			notify.error(error.message || 'Failed to save portfolio settings');
		} finally {
			isSaving = false;
		}
	}
	
	/**
	 * Load risk parameters from blockchain
	 */
	async function loadOnChainSettings() {
		if (!$walletAddress) return;
		
		try {
			const riskParams = await portfolioContractService.getRiskParameters($walletAddress);
			
			if (riskParams.stopLoss > 0 || riskParams.takeProfit > 0) {
				hasOnChainSettings = true;
				console.log('✅ Loaded on-chain risk parameters:', riskParams);
				
				// Optionally sync with local settings
				// (commented out to avoid overwriting user's local changes)
				// stopLossPercent = riskParams.stopLoss;
				// takeProfitPercent = riskParams.takeProfit;
			}
		} catch (error) {
			console.error('Error loading on-chain settings:', error);
			// Don't show error - it's okay if there are no on-chain settings yet
		}
	}
	
	/**
	 * Save risk parameters to blockchain
	 */
	async function saveToBlockchain() {
		if (!$walletAddress) {
			notify.error('Please connect your wallet first');
			return;
		}
		
		isSyncingBlockchain = true;
		
		try {
			const riskParams = {
				stopLoss: stopLossPercent > 0 ? stopLossPercent : null,
				takeProfit: takeProfitPercent > 0 ? takeProfitPercent : null
			};
			
			notify.info('Saving risk parameters to blockchain...');
			
			const result = await portfolioContractService.setRiskParameters(riskParams);
			
			if (result.success) {
				notify.success('Risk parameters saved to blockchain!');
				hasOnChainSettings = true;
				
				// Reload on-chain settings
				await loadOnChainSettings();
			}
		} catch (error) {
			console.error('Error saving to blockchain:', error);
			notify.error(`Failed to save to blockchain: ${error.message}`);
		} finally {
			isSyncingBlockchain = false;
		}
	}
	
	/**
	 * Combined save - saves to both local storage and blockchain
	 */
	async function saveSettingsComplete() {
		// First save locally (fast)
		await saveSettings();
		
		// Then save to blockchain (slower, requires transaction)
		await saveToBlockchain();
	}
	
	function resetToDefaults() {
		stopLossPercent = 10;
		takeProfitPercent = 20;
		autoBuyPercent = 5;
		autoRebalanceEnabled = false;
		rebalanceThreshold = 5;
		trailingStopEnabled = false;
		trailingStopPercent = 5;
		maxGasPercent = 2;
		minTradeValue = 10;
		
		notify.info('Settings reset to defaults');
	}
	
	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
			Portfolio Settings
		</h2>
		<button
			onclick={toggleAdvanced}
			class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
		>
			{showAdvanced ? 'Hide' : 'Show'} Advanced
		</button>
	</div>
	
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Stop-Loss Setting -->
			<div>
				<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
					Stop-Loss Percentage
					<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
						(Auto-sell when price drops by this %)
					</span>
				</label>
				<div class="flex items-center gap-4">
					<input
						type="range"
						min="1"
						max="50"
						step="0.5"
						bind:value={stopLossPercent}
						class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
					/>
					<div class="flex items-center gap-2 min-w-[100px]">
						<input
							type="number"
							min="1"
							max="50"
							step="0.5"
							bind:value={stopLossPercent}
							class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
						/>
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
					</div>
				</div>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Automatically sell to USDC when price drops {stopLossPercent}% from purchase price
				</p>
			</div>
			
			<!-- Take-Profit Setting -->
			<div>
				<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
					Take-Profit Percentage
					<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
						(Auto-sell when price rises by this %)
					</span>
				</label>
				<div class="flex items-center gap-4">
					<input
						type="range"
						min="1"
						max="200"
						step="1"
						bind:value={takeProfitPercent}
						class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
					/>
					<div class="flex items-center gap-2 min-w-[100px]">
						<input
							type="number"
							min="1"
							max="200"
							step="1"
							bind:value={takeProfitPercent}
							class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
						/>
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
					</div>
				</div>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Automatically sell when price rises {takeProfitPercent}% from purchase price
				</p>
			</div>
			
			<!-- Auto-Buy Setting -->
			<div>
				<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
					Auto-Buy Percentage
					<span class="text-gray-500 dark:text-gray-400 font-normal ml-2">
						(Auto-buy when price drops by this %)
					</span>
				</label>
				<div class="flex items-center gap-4">
					<input
						type="range"
						min="1"
						max="50"
						step="0.5"
						bind:value={autoBuyPercent}
						class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
					/>
					<div class="flex items-center gap-2 min-w-[100px]">
						<input
							type="number"
							min="1"
							max="50"
							step="0.5"
							bind:value={autoBuyPercent}
							class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
						/>
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
					</div>
				</div>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Automatically buy more when price drops {autoBuyPercent}% (dollar-cost averaging)
				</p>
			</div>
			
			<!-- Auto-Rebalance Setting -->
			<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
				<div class="flex items-center justify-between mb-4">
					<div>
						<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
							Auto-Rebalance Portfolio
						</label>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Automatically rebalance when allocations drift from targets
						</p>
					</div>
					<button
						onclick={() => autoRebalanceEnabled = !autoRebalanceEnabled}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {autoRebalanceEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
					>
						<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {autoRebalanceEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>
				
				{#if autoRebalanceEnabled}
					<div class="ml-4 pl-4 border-l-2 border-blue-500">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Rebalance Threshold
						</label>
						<div class="flex items-center gap-4">
							<input
								type="range"
								min="1"
								max="50"
								step="0.5"
								bind:value={rebalanceThreshold}
								class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
							/>
							<div class="flex items-center gap-2 min-w-[100px]">
								<input
									type="number"
									min="1"
									max="50"
									step="0.5"
									bind:value={rebalanceThreshold}
									class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
								/>
								<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
							</div>
						</div>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Rebalance when any token drifts {rebalanceThreshold}% from target allocation
						</p>
					</div>
				{/if}
			</div>
			
			<!-- Advanced Settings -->
			{#if showAdvanced}
				<div class="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Advanced Settings
					</h3>
					
					<!-- Trailing Stop-Loss -->
					<div>
						<div class="flex items-center justify-between mb-4">
							<div>
								<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
									Trailing Stop-Loss
								</label>
								<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Stop-loss that follows price upward
								</p>
							</div>
							<button
								onclick={() => trailingStopEnabled = !trailingStopEnabled}
								class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {trailingStopEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
							>
								<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {trailingStopEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
							</button>
						</div>
						
						{#if trailingStopEnabled}
							<div class="ml-4 pl-4 border-l-2 border-blue-500">
								<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Trailing Distance
								</label>
								<div class="flex items-center gap-4">
									<input
										type="range"
										min="1"
										max="50"
										step="0.5"
										bind:value={trailingStopPercent}
										class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
									/>
									<div class="flex items-center gap-2 min-w-[100px]">
										<input
											type="number"
											min="1"
											max="50"
											step="0.5"
											bind:value={trailingStopPercent}
											class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
										/>
										<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
									</div>
								</div>
								<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Stop-loss trails {trailingStopPercent}% below highest price reached
								</p>
							</div>
						{/if}
					</div>
					
					<!-- Max Gas Percentage -->
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Maximum Gas Cost
						</label>
						<div class="flex items-center gap-4">
							<input
								type="range"
								min="0.1"
								max="10"
								step="0.1"
								bind:value={maxGasPercent}
								class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
							/>
							<div class="flex items-center gap-2 min-w-[100px]">
								<input
									type="number"
									min="0.1"
									max="10"
									step="0.1"
									bind:value={maxGasPercent}
									class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
								/>
								<span class="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
							</div>
						</div>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Defer rebalancing if gas costs exceed {maxGasPercent}% of trade value
						</p>
					</div>
					
					<!-- Minimum Trade Value -->
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Minimum Trade Value (USD)
						</label>
						<div class="flex items-center gap-4">
							<input
								type="range"
								min="1"
								max="100"
								step="1"
								bind:value={minTradeValue}
								class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
							/>
							<div class="flex items-center gap-2 min-w-[100px]">
								<span class="text-sm font-medium text-gray-600 dark:text-gray-400">$</span>
								<input
									type="number"
									min="1"
									max="100"
									step="1"
									bind:value={minTradeValue}
									class="w-20 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
						</div>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Skip trades below ${minTradeValue} to save on gas costs
						</p>
					</div>
				</div>
			{/if}
			
			<!-- Action Buttons -->
			<div class="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
				<button
					onclick={saveSettings}
					disabled={isSaving}
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
						Save Settings
					{/if}
				</button>
				
				<button
					onclick={resetToDefaults}
					disabled={isSaving}
					class="px-6 py-3 rounded-lg font-semibold transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Reset to Defaults
				</button>
			</div>
			
			<!-- Info Box -->
			<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
				<div class="flex gap-2">
					<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div class="text-xs text-blue-900 dark:text-blue-100">
						<p class="font-medium mb-1">Settings are saved per portfolio</p>
						<p class="text-blue-700 dark:text-blue-300">
							Each portfolio can have different risk management and rebalancing settings. Changes take effect immediately.
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
