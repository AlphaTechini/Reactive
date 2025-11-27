<script>
	import { goto } from '$app/navigation';
	import { simulationBalance, simulationPortfolios, createPortfolio } from '$lib/stores/simulation';

	let portfolioName = '';
	let description = '';
	let depositAmount = '';
	let error = '';
	let isSubmitting = false;

	// Get available balance from the simulation store
	$: availableBalance = $simulationBalance;

	// Real-time validation
	$: nameError = validateName(portfolioName);
	$: amountError = validateAmount(depositAmount, availableBalance);

	function validateName(name) {
		if (!name || !name.trim()) {
			return '';
		}
		
		if (name.trim().length < 2) {
			return 'Portfolio name must be at least 2 characters';
		}
		
		if (name.trim().length > 50) {
			return 'Portfolio name must be less than 50 characters';
		}
		
		if ($simulationPortfolios[name.trim()]) {
			return 'Portfolio with this name already exists';
		}
		
		return '';
	}

	function validateAmount(amount, balance) {
		if (!amount || amount === '') {
			return '';
		}
		
		const numAmount = parseFloat(amount);
		
		if (isNaN(numAmount)) {
			return 'Please enter a valid number';
		}
		
		if (numAmount <= 0) {
			return 'Deposit amount must be positive';
		}
		
		if (numAmount > balance) {
			return `Insufficient balance. Available: $${balance.toFixed(2)}`;
		}
		
		return '';
	}

	async function handleSubmit(event) {
		event.preventDefault();
		
		// Prevent double submission
		if (isSubmitting) {
			return;
		}
		
		error = '';
		isSubmitting = true;

		try {
			// Final validation
			const trimmedName = portfolioName.trim();
			const amount = parseFloat(depositAmount);

			if (!trimmedName) {
				throw new Error('Portfolio name is required');
			}

			if (trimmedName.length < 2) {
				throw new Error('Portfolio name must be at least 2 characters');
			}

			if (trimmedName.length > 50) {
				throw new Error('Portfolio name must be less than 50 characters');
			}

			if ($simulationPortfolios[trimmedName]) {
				throw new Error('Portfolio with this name already exists');
			}

			if (isNaN(amount) || amount <= 0) {
				throw new Error('Deposit amount must be a positive number');
			}

			if (amount > availableBalance) {
				throw new Error(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
			}

			// Create the portfolio using the simulation store
			console.log('📝 Creating portfolio:', trimmedName);
			createPortfolio(trimmedName, description.trim(), amount);
			console.log('✅ Portfolio created successfully');

			// Redirect to settings page to configure token allocations
			await goto(`/simulated/portfolio/${encodeURIComponent(trimmedName)}/settings`);
		} catch (err) {
			console.error('❌ Portfolio creation error:', err);
			error = err.message || 'Failed to create portfolio. Please try again.';
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Portfolio - Simulation Mode</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
	<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
		<!-- Back Button -->
		<button
			onclick={() => goto('/simulated/dashboard')}
			class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6 group"
			aria-label="Back to dashboard"
		>
			<svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			Back to Dashboard
		</button>

		<div class="mb-8">
			<h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
				Create New Portfolio
			</h1>
			<p class="text-gray-600 dark:text-gray-300">
				Set up your portfolio with a name and initial deposit
			</p>
		</div>

		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
			<form onsubmit={handleSubmit} class="space-y-6">
				<!-- Portfolio Name -->
				<div class="group">
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
						Portfolio Name <span class="text-red-500">*</span>
						<span class="group/tooltip relative">
							<svg class="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-10 transition-all duration-200">
								Choose a unique name for your portfolio (2-50 characters)
							</span>
						</span>
					</label>
					<div class="relative">
						<input
							id="name"
							type="text"
							bind:value={portfolioName}
							placeholder="e.g., My Crypto Portfolio"
							class="w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-gray-300={!nameError}
							class:dark:border-gray-600={!nameError}
							class:border-red-500={nameError}
							class:dark:border-red-500={nameError}
							required
							disabled={isSubmitting}
							aria-invalid={!!nameError}
							aria-describedby={nameError ? 'name-error' : undefined}
						/>
						{#if portfolioName && !nameError}
							<div class="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" aria-label="Valid input">
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							</div>
						{/if}
					</div>
					{#if nameError}
						<p id="name-error" class="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							{nameError}
						</p>
					{/if}
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Description <span class="text-gray-400 text-xs">(Optional)</span>
					</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Describe your investment strategy..."
						rows="3"
						maxlength="200"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={isSubmitting}
					></textarea>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
						{description.length}/200 characters
					</p>
				</div>

				<!-- Deposit Amount -->
				<div>
					<label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
						Initial Deposit Amount (USD) <span class="text-red-500">*</span>
						<span class="group/tooltip relative">
							<svg class="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="invisible group-hover/tooltip:visible absolute left-0 top-6 w-56 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-10 transition-all duration-200">
								Amount to allocate from your $10,000 simulation balance. You can create multiple portfolios.
							</span>
						</span>
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
						<input
							id="amount"
							type="number"
							bind:value={depositAmount}
							placeholder="0.00"
							step="0.01"
							min="0"
							max={availableBalance}
							class="w-full pl-8 pr-24 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-gray-300={!amountError}
							class:dark:border-gray-600={!amountError}
							class:border-red-500={amountError}
							class:dark:border-red-500={amountError}
							required
							disabled={isSubmitting}
							aria-invalid={!!amountError}
							aria-describedby={amountError ? 'amount-error' : 'amount-help'}
						/>
						<button
							type="button"
							onclick={() => depositAmount = availableBalance.toString()}
							disabled={isSubmitting}
							class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
							title="Use maximum available balance"
						>
							MAX
						</button>
					</div>
					<div class="mt-2 flex items-center justify-between text-sm">
						<p id="amount-help" class="text-gray-500 dark:text-gray-400 flex items-center gap-1">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							Available: ${availableBalance.toFixed(2)}
						</p>
						{#if depositAmount && !amountError}
							<p class="text-green-600 dark:text-green-400 text-xs font-medium">
								✓ Valid amount
							</p>
						{/if}
					</div>
					{#if amountError}
						<p id="amount-error" class="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							{amountError}
						</p>
					{/if}
				</div>

				<!-- Error Message -->
				{#if error}
					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
						<div class="flex items-start gap-3">
							<svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
							</svg>
							<p class="text-red-800 dark:text-red-200 text-sm">{error}</p>
						</div>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex flex-col sm:flex-row gap-3 pt-6">
					<button
						type="button"
						onclick={() => goto('/simulated/dashboard')}
						disabled={isSubmitting}
						class="sm:flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || !!nameError || !!amountError || !portfolioName || !depositAmount}
						class="sm:flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
					>
						{#if isSubmitting}
							<span class="flex items-center justify-center gap-2">
								<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Creating...
							</span>
						{:else}
							<span class="flex items-center justify-center gap-2">
								Continue to Token Selection
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</span>
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Info Card with Animation -->
		<div class="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center animate-pulse">
					<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="flex-1">
					<h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
						What happens next?
						<span class="text-xs px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full">3 steps</span>
					</h3>
					<ol class="space-y-3 text-sm text-blue-800 dark:text-blue-200">
						<li class="flex items-start gap-3 group">
							<span class="flex-shrink-0 w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 group-hover:scale-110 group-hover:bg-blue-300 dark:group-hover:bg-blue-700">1</span>
							<span class="flex-1 transition-all duration-200 group-hover:translate-x-1">Choose which tokens to include in your portfolio</span>
						</li>
						<li class="flex items-start gap-3 group">
							<span class="flex-shrink-0 w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 group-hover:scale-110 group-hover:bg-blue-300 dark:group-hover:bg-blue-700">2</span>
							<span class="flex-1 transition-all duration-200 group-hover:translate-x-1">Set allocation percentages for each token</span>
						</li>
						<li class="flex items-start gap-3 group">
							<span class="flex-shrink-0 w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 group-hover:scale-110 group-hover:bg-blue-300 dark:group-hover:bg-blue-700">3</span>
							<span class="flex-1 transition-all duration-200 group-hover:translate-x-1">Review and confirm your portfolio setup</span>
						</li>
					</ol>
				</div>
			</div>
		</div>

		<!-- Quick Tips -->
		<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
						<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h4 class="font-semibold text-gray-900 dark:text-white text-sm">No Real Funds</h4>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">Practice with $10,000 virtual balance</p>
			</div>
			
			<div class="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
						<svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<h4 class="font-semibold text-gray-900 dark:text-white text-sm">Real Prices</h4>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">Live market data for accurate simulation</p>
			</div>
			
			<div class="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
						<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<h4 class="font-semibold text-gray-900 dark:text-white text-sm">Track Performance</h4>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400">Monitor P/L and portfolio metrics</p>
			</div>
		</div>
	</div>
</div>
