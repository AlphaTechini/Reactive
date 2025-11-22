<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletAddress, walletBalance, walletService } from '$lib/stores/wallet.js';
	import { createPortfolio } from '$lib/stores/portfolios.js';
	import { notify } from '$lib/notify.js';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import RouteGuard from '$lib/components/RouteGuard.svelte';
	
	let portfolioName = '';
	let portfolioDescription = '';
	let depositAmount = '';
	let isCreating = false;
	let errors = {
		name: '',
		description: '',
		amount: ''
	};
	
	// Redirect if wallet not connected
	onMount(() => {
		if (!$walletAddress) {
			notify.error('Please connect your wallet first');
			goto('/');
		}
	});
	
	function validateForm() {
		errors = { name: '', description: '', amount: '' };
		let isValid = true;
		
		// Validate portfolio name
		if (!portfolioName.trim()) {
			errors.name = 'Portfolio name is required';
			isValid = false;
		} else if (portfolioName.length < 3) {
			errors.name = 'Portfolio name must be at least 3 characters';
			isValid = false;
		} else if (portfolioName.length > 50) {
			errors.name = 'Portfolio name must be less than 50 characters';
			isValid = false;
		}
		
		// Validate description (optional but if provided, check length)
		if (portfolioDescription && portfolioDescription.length > 200) {
			errors.description = 'Description must be less than 200 characters';
			isValid = false;
		}
		
		// Validate deposit amount
		if (!depositAmount) {
			errors.amount = 'Deposit amount is required';
			isValid = false;
		} else {
			const amount = parseFloat(depositAmount);
			if (isNaN(amount) || amount <= 0) {
				errors.amount = 'Please enter a valid amount greater than 0';
				isValid = false;
			} else if (amount > parseFloat($walletBalance)) {
				errors.amount = 'Insufficient balance';
				isValid = false;
			}
		}
		
		return isValid;
	}
	
	async function handleCreatePortfolio() {
		if (!validateForm()) {
			notify.error('Please fix the errors in the form');
			return;
		}
		
		isCreating = true;
		
		try {
			console.log('📝 Creating portfolio with data:', {
				name: portfolioName.trim(),
				description: portfolioDescription.trim(),
				initialDeposit: depositAmount
			});
			
			// Create portfolio metadata (off-chain storage)
			const portfolioData = {
				name: portfolioName.trim(),
				description: portfolioDescription.trim(),
				initialDeposit: depositAmount,
				balance: depositAmount,
				performance: 0,
				assetCount: 0,
				allocations: [],
				settings: {
					stopLoss: null,
					takeProfit: null,
					autoBuy: null,
					autoRebalance: false,
					rebalanceThreshold: 5
				},
				onChain: false, // Will be set to true after blockchain confirmation
				transactionHash: null,
				blockNumber: null
			};
			
			// Store portfolio metadata to backend first
			const portfolio = await createPortfolio(portfolioData);
			
			console.log('✅ Portfolio created:', portfolio);
			
			// Verify portfolio has an ID
			if (!portfolio || !portfolio.id) {
				console.error('❌ Portfolio created but no ID returned:', portfolio);
				notify.warning('Portfolio created but redirect failed. Check portfolios page.');
				goto('/portfolios');
				return;
			}
			
			notify.success(`Portfolio "${portfolioName}" created successfully! Redirecting...`);
			
			console.log('🔄 Redirecting to:', `/portfolio/${portfolio.id}`);
			
			// Note: On-chain portfolio creation happens when user sets token allocations
			// in the portfolio management page. This allows users to configure their
			// portfolio before committing to the blockchain.
			
			// Small delay to ensure notification is visible
			setTimeout(() => {
				goto(`/portfolio/${portfolio.id}`);
			}, 500);
			
		} catch (error) {
			console.error('❌ Error creating portfolio:', error);
			notify.error(`Failed to create portfolio: ${error.message}`);
		} finally {
			isCreating = false;
		}
	}
	
	function handleCancel() {
		goto('/');
	}
	
	// Auto-format balance display
	$: formattedBalance = walletService.formatBalance($walletBalance);
	$: maxDeposit = parseFloat($walletBalance) || 0;
	
	function setMaxAmount() {
		depositAmount = maxDeposit.toString();
	}
</script>

<svelte:head>
	<title>Create Portfolio - Reactive Portfolio Manager</title>
</svelte:head>

<RouteGuard requireWallet={true} message="Please connect your wallet to create a portfolio">
<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
	<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
		<Breadcrumb />
		<!-- Header -->
		<div class="mb-8">
			<button
				onclick={handleCancel}
				class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Home
			</button>
			
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
				Create New Portfolio
			</h1>
			<p class="text-gray-600 dark:text-gray-400">
				Set up your automated portfolio with custom risk management and rebalancing
			</p>
		</div>
		
		<!-- Wallet Info Card -->
		<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-blue-600 dark:text-blue-400 mb-1">Connected Wallet</p>
					<p class="font-mono text-sm font-semibold text-gray-900 dark:text-white">
						{walletService.formatAddress($walletAddress)}
					</p>
				</div>
				<div class="text-right">
					<p class="text-sm text-blue-600 dark:text-blue-400 mb-1">Available Balance</p>
					<p class="text-2xl font-bold text-gray-900 dark:text-white">
						{formattedBalance} REACT
					</p>
				</div>
			</div>
		</div>
		
		<!-- Form Card -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
			<form onsubmit={(e) => { e.preventDefault(); handleCreatePortfolio(); }} class="space-y-6">
				<!-- Portfolio Name -->
				<div>
					<label for="portfolioName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Portfolio Name <span class="text-red-500">*</span>
					</label>
					<input
						id="portfolioName"
						type="text"
						bind:value={portfolioName}
						placeholder="e.g., My DeFi Portfolio"
						class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
						class:border-red-500={errors.name}
						disabled={isCreating}
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-500">{errors.name}</p>
					{/if}
				</div>
				
				<!-- Portfolio Description -->
				<div>
					<label for="portfolioDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Description (Optional)
					</label>
					<textarea
						id="portfolioDescription"
						bind:value={portfolioDescription}
						placeholder="Describe your portfolio strategy..."
						rows="3"
						class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
						class:border-red-500={errors.description}
						disabled={isCreating}
					></textarea>
					{#if errors.description}
						<p class="mt-1 text-sm text-red-500">{errors.description}</p>
					{/if}
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{portfolioDescription.length}/200 characters
					</p>
				</div>
				
				<!-- Deposit Amount -->
				<div>
					<label for="depositAmount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Initial Deposit Amount (REACT) <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<input
							id="depositAmount"
							type="number"
							step="0.000001"
							bind:value={depositAmount}
							placeholder="0.0"
							class="w-full px-4 py-3 pr-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							class:border-red-500={errors.amount}
							disabled={isCreating}
						/>
						<button
							type="button"
							onclick={setMaxAmount}
							class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
							disabled={isCreating}
						>
							MAX
						</button>
					</div>
					{#if errors.amount}
						<p class="mt-1 text-sm text-red-500">{errors.amount}</p>
					{/if}
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Available: {formattedBalance} REACT
					</p>
				</div>
				
				<!-- Info Box -->
				<div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
					<div class="flex gap-3">
						<svg class="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="text-sm text-purple-900 dark:text-purple-100">
							<p class="font-medium mb-1">What happens next?</p>
							<ul class="space-y-1 text-purple-700 dark:text-purple-300">
								<li>• Your portfolio will be created with the specified deposit</li>
								<li>• You'll be able to select tokens and set allocation percentages</li>
								<li>• Configure risk management settings (stop-loss, take-profit, auto-buy)</li>
								<li>• Enable auto-rebalancing to maintain your target allocation</li>
							</ul>
						</div>
					</div>
				</div>
				
				<!-- Action Buttons -->
				<div class="flex gap-4 pt-4">
					<button
						type="button"
						onclick={handleCancel}
						class="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						disabled={isCreating}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						disabled={isCreating}
					>
						{#if isCreating}
							<span class="flex items-center justify-center gap-2">
								<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Creating Portfolio...
							</span>
						{:else}
							Create Portfolio
						{/if}
					</button>
				</div>
			</form>
		</div>
		
		<!-- Features Preview -->
		<div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
				<div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3">
					<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">Token Allocation</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Select tokens and set percentage allocations
				</p>
			</div>
			
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
				<div class="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3">
					<svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">Risk Management</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Configure stop-loss and take-profit levels
				</p>
			</div>
			
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
				<div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3">
					<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">Auto-Rebalancing</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Maintain target allocation automatically
				</p>
			</div>
		</div>
	</div>
</div>
</RouteGuard>
