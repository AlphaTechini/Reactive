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

			// Redirect to portfolio page
			await goto(`/simulated/portfolio/${encodeURIComponent(trimmedName)}`);
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
	<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
				Create New Portfolio
			</h1>
			<p class="text-gray-600 dark:text-gray-300">
				Set up your portfolio with a name and initial deposit
			</p>
		</div>

		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
			<form onsubmit={handleSubmit} class="space-y-6">
				<!-- Portfolio Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Portfolio Name *
					</label>
					<input
						id="name"
						type="text"
						bind:value={portfolioName}
						placeholder="e.g., My Crypto Portfolio"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
						required
						disabled={isSubmitting}
					/>
					{#if nameError}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
					{/if}
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Description (Optional)
					</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Describe your investment strategy..."
						rows="3"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
						disabled={isSubmitting}
					></textarea>
				</div>

				<!-- Deposit Amount -->
				<div>
					<label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Initial Deposit Amount (USD) *
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
						<input
							id="amount"
							type="number"
							bind:value={depositAmount}
							placeholder="0.00"
							step="0.01"
							min="0"
							max={availableBalance}
							class="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
							required
							disabled={isSubmitting}
						/>
					</div>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
						Available balance: ${availableBalance.toFixed(2)}
					</p>
					{#if amountError}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{amountError}</p>
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
				<div class="flex gap-4 pt-4">
					<button
						type="button"
						onclick={() => goto('/simulated/dashboard')}
						disabled={isSubmitting}
						class="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || nameError || amountError}
						class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
							Continue to Token Selection →
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Info Card -->
		<div class="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
			<h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Next Steps</h3>
			<ol class="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
				<li>Choose which tokens to include in your portfolio</li>
				<li>Set allocation percentages for each token</li>
				<li>Review and confirm your portfolio setup</li>
			</ol>
		</div>
	</div>
</div>
