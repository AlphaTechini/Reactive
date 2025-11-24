<script>
	import { goto } from '$app/navigation';
	import { simulationPortfolio } from '$lib/stores/simulation';

	function navigateTo(path) {
		goto(`/simulated${path}`);
	}

	$: balance = $simulationPortfolio?.balance || 10000;
</script>

<svelte:head>
	<title>Simulation Mode - Reactive Portfolio</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Hero Section -->
		<div class="text-center mb-12">
			<h1 class="text-5xl font-bold text-gray-900 dark:text-white mb-4">
				Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Simulation Mode</span>
			</h1>
			<p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
				Test portfolio features with instant calculations - no blockchain required
			</p>
			
			<!-- Balance Card -->
			<div class="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
				<div class="text-center mb-6">
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Virtual Balance</p>
					<p class="text-4xl font-bold text-gray-900 dark:text-white">
						${balance.toFixed(2)}
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
						💾 Stored in browser • 📈 Real prices • 🧮 Instant calculations
					</p>
				</div>
				
				<!-- Action Buttons -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<button
						onclick={() => navigateTo('/dashboard')}
						class="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Dashboard
					</button>
					
					<button
						onclick={() => navigateTo('/trade')}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						Trade
					</button>
					
					<button
						onclick={() => goto('/')}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						Exit Simulation
					</button>
				</div>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">⚡</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Instant Execution</h3>
				<p class="text-gray-600 dark:text-gray-300">No waiting for blockchain confirmations. Trades execute immediately with pure calculations.</p>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">📈</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Real Market Prices</h3>
				<p class="text-gray-600 dark:text-gray-300">Uses actual token prices from live APIs for realistic simulation experience.</p>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">💰</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Unlimited Testing</h3>
				<p class="text-gray-600 dark:text-gray-300">Start with $10,000 virtual balance. Reset anytime to test different strategies.</p>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">📊</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Track Performance</h3>
				<p class="text-gray-600 dark:text-gray-300">Monitor profit/loss, holdings, and transaction history in real-time.</p>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">🔒</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Risk-Free Learning</h3>
				<p class="text-gray-600 dark:text-gray-300">Perfect for testing strategies without risking real funds or gas fees.</p>
			</div>

			<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
				<div class="text-4xl mb-4">💾</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Local Storage</h3>
				<p class="text-gray-600 dark:text-gray-300">All data saved in your browser. No accounts, no servers, complete privacy.</p>
			</div>
		</div>
	</div>
</div>
