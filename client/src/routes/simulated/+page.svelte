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

<div class="min-h-screen bg-[#f7f7f5] dark:bg-[#0b0b0b] relative overflow-hidden">
	<!-- Premium Gold Background Elements -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<!-- Large ambient gold glows -->
		<div class="absolute top-20 left-10 w-96 h-96 bg-[#d4af37] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-[0.04] dark:opacity-[0.05]"></div>
		<div class="absolute bottom-20 right-10 w-96 h-96 bg-[#c9a227] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-[0.04] dark:opacity-[0.05]"></div>
		<!-- Decorative gold coin elements -->
		<div class="absolute top-32 right-[15%] w-20 h-20 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.08] dark:opacity-[0.12] shadow-lg"></div>
		<div class="absolute top-48 right-[8%] w-12 h-12 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.06] dark:opacity-[0.10]"></div>
		<div class="absolute top-24 left-[12%] w-16 h-16 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.06] dark:opacity-[0.10]"></div>
		<div class="absolute bottom-40 left-[18%] w-14 h-14 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.05] dark:opacity-[0.08]"></div>
		<!-- Subtle gold pattern lines -->
		<div class="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/8 dark:via-[#d4af37]/10 to-transparent"></div>
	</div>

	<div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Hero Section with Layered Readability -->
		<div class="text-center mb-12 relative">
			<!-- Layer 1: Localized Backdrop Blur (behind text only) -->
			<div class="absolute inset-0 -mx-8 -my-4 backdrop-blur-[2px] rounded-3xl pointer-events-none" style="mask-image: radial-gradient(ellipse 70% 70% at 50% 35%, black 30%, transparent 70%);"></div>
			
			<!-- Layer 2: Gradient Contrast Mask - Light mode uses warm gray, dark mode uses black -->
			<div class="absolute inset-0 -mx-12 -my-8 rounded-3xl pointer-events-none bg-[radial-gradient(ellipse_65%_60%_at_50%_35%,rgba(60,55,50,0.18)_0%,rgba(60,55,50,0.08)_40%,transparent_70%)] dark:bg-[radial-gradient(ellipse_65%_60%_at_50%_35%,rgba(0,0,0,0.40)_0%,rgba(0,0,0,0.20)_40%,transparent_70%)]"></div>
			
			<!-- Hero Content with Typography Reinforcement -->
			<div class="relative z-10">
				<h1 class="text-5xl font-bold mb-4">
					<span class="text-gray-900 dark:text-gray-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" style="text-shadow: 0 1px 2px rgba(0,0,0,0.06);">Welcome to </span><span class="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));">Simulation Mode</span>
				</h1>
				<p class="text-xl text-gray-700 dark:text-gray-400 mb-8 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" style="text-shadow: 0 1px 1px rgba(255,255,255,0.3);">
					Test portfolio features with instant calculations - no blockchain required
				</p>
			</div>
			
			<!-- Balance Card -->
			<div class="max-w-2xl mx-auto bg-white dark:bg-[#111111] rounded-2xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-800">
				<div class="text-center mb-6">
					<p class="text-sm text-gray-500 dark:text-gray-500 mb-1">Virtual Balance</p>
					<p class="text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] bg-clip-text text-transparent">
						${balance.toFixed(2)}
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
						💾 Stored in browser • 📈 Real prices • 🧮 Instant calculations
					</p>
				</div>
				
				<!-- Action Buttons -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<button
						onclick={() => navigateTo('/dashboard')}
						class="flex items-center justify-center gap-2 btn-gold font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Dashboard
					</button>
					
					<button
						onclick={() => navigateTo('/trade')}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold py-4 px-6 rounded-xl transition-all border border-gray-200 dark:border-gray-800"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						Trade
					</button>
					
					<button
						onclick={() => goto('/')}
						class="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold py-4 px-6 rounded-xl transition-all border border-gray-200 dark:border-gray-800"
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
			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">⚡</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Instant Execution</h3>
				<p class="text-gray-600 dark:text-gray-400">No waiting for blockchain confirmations. Trades execute immediately with pure calculations.</p>
			</div>

			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">📈</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Real Market Prices</h3>
				<p class="text-gray-600 dark:text-gray-400">Uses actual token prices from live APIs for realistic simulation experience.</p>
			</div>

			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">💰</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Unlimited Testing</h3>
				<p class="text-gray-600 dark:text-gray-400">Start with $10,000 virtual balance. Reset anytime to test different strategies.</p>
			</div>

			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">📊</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Track Performance</h3>
				<p class="text-gray-600 dark:text-gray-400">Monitor profit/loss, holdings, and transaction history in real-time.</p>
			</div>

			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">🔒</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Risk-Free Learning</h3>
				<p class="text-gray-600 dark:text-gray-400">Perfect for testing strategies without risking real funds or gas fees.</p>
			</div>

			<div class="bg-white dark:bg-[#111111] rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/50 transition-colors">
				<div class="text-4xl mb-4">💾</div>
				<h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Local Storage</h3>
				<p class="text-gray-600 dark:text-gray-400">All data saved in your browser. No accounts, no servers, complete privacy.</p>
			</div>
		</div>
	</div>
</div>
