<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let isVisible = false;
	
	onMount(() => {
		isVisible = true;
	});
	
	function goToSimulation() {
		goto('/simulated');
	}
	
	function goToLive() {
		// Disabled for now - coming soon
	}
</script>

<div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
	<!-- Animated Background -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute top-20 left-10 w-72 h-72 bg-purple-500 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-10 dark:opacity-5 animate-blob"></div>
		<div class="absolute top-40 right-10 w-72 h-72 bg-blue-500 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-10 dark:opacity-5 animate-blob animation-delay-2000"></div>
		<div class="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-10 dark:opacity-5 animate-blob animation-delay-4000"></div>
	</div>
	
	<div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Hero Section -->
		<div class="text-center mb-20 pt-12" class:opacity-0={!isVisible} class:translate-y-10={!isVisible} class:opacity-100={isVisible} class:translate-y-0={isVisible} style="transition: all 0.8s ease-out;">
			<h1 class="text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
				<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
					Stop Losing Money.
				</span>
				<br />
				<span class="text-gray-900 dark:text-white">Start Trading Smart.</span>
			</h1>
			
			<p class="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
				Automated portfolio management that protects your wealth with intelligent stop-loss, 
				take-profit, and auto-rebalancing strategies.
			</p>
			
			<div class="inline-block bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-2xl px-6 py-4 mb-12">
				<p class="text-lg text-red-600 dark:text-red-300 font-semibold">
					⚠️ Trading losses contribute to financial stress and mental health crises
				</p>
				<p class="text-gray-700 dark:text-gray-300 mt-2">
					Our platform helps you trade responsibly with automated risk management
				</p>
			</div>
		</div>
		
		<!-- Value Propositions -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
			<div class="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
				<div class="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
					<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Protect Your Capital</h3>
				<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
					Automated stop-loss triggers prevent catastrophic losses. Sleep peacefully knowing your investments are protected 24/7.
				</p>
			</div>
			
			<div class="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
				<div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-xl flex items-center justify-center mb-6">
					<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Maximize Profits</h3>
				<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
					Smart take-profit strategies lock in gains automatically. Never miss an opportunity to secure your returns.
				</p>
			</div>
			
			<div class="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
				<div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center mb-6">
					<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Auto-Rebalancing</h3>
				<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
					Maintain optimal portfolio allocation effortlessly. Our algorithms keep your strategy on track without manual intervention.
				</p>
			</div>
		</div>
		
		<!-- Stats Section -->
		<div class="bg-gray-100 dark:bg-gray-800 rounded-3xl p-12 mb-20 border border-gray-200 dark:border-gray-700">
			<h2 class="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">Why Automated Risk Management Matters</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
				<div>
					<div class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 mb-3">
						78%
					</div>
					<p class="text-gray-700 dark:text-gray-300 text-lg">
						of retail traders lose money due to poor risk management
					</p>
				</div>
				<div>
					<div class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 mb-3">
						24/7
					</div>
					<p class="text-gray-700 dark:text-gray-300 text-lg">
						protection with automated monitoring and execution
					</p>
				</div>
				<div>
					<div class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 mb-3">
						0ms
					</div>
					<p class="text-gray-700 dark:text-gray-300 text-lg">
						emotional decision-making with algorithmic precision
					</p>
				</div>
			</div>
		</div>
		
		<!-- Features Grid -->
		<div class="mb-20">
			<h2 class="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">Built for Serious Traders</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Smart Stop-Loss</h3>
							<p class="text-gray-700 dark:text-gray-300">Automatically convert to stablecoins when markets crash, preserving your capital</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Take-Profit Automation</h3>
							<p class="text-gray-700 dark:text-gray-300">Lock in gains at your target percentages without watching charts 24/7</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Portfolio Rebalancing</h3>
							<p class="text-gray-700 dark:text-gray-300">Maintain your target allocation automatically as market conditions change</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<div>
							<h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Reactive Network</h3>
							<p class="text-gray-700 dark:text-gray-300">Lightning-fast execution on decentralized infrastructure you can trust</p>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<!-- CTA Section -->
		<div class="text-center mb-12">
			<h2 class="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">Ready to Trade Smarter?</h2>
			<p class="text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
				Choose your path: Practice risk-free in simulation mode or go live with real funds
			</p>
			
			<div class="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-3xl mx-auto">
				<!-- Simulation Mode Button -->
				<button
					onclick={goToSimulation}
					class="group relative w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/50"
				>
					<div class="flex flex-col items-center gap-2">
						<span class="text-2xl">🎮</span>
						<span>Test in Simulation Mode</span>
						<span class="text-sm font-normal text-blue-200">Zero Risk • $10,000 Virtual Funds</span>
					</div>
				</button>
				
				<!-- Live Mode Button (Disabled) -->
				<button
					disabled
					class="group relative w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl font-bold text-xl transition-all duration-300 opacity-60 cursor-not-allowed"
				>
					<div class="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
						COMING SOON
					</div>
					<div class="flex flex-col items-center gap-2">
						<span class="text-2xl">🚀</span>
						<span>Use Real Funds</span>
						<span class="text-sm font-normal text-gray-300">Live Mode • Real Trading</span>
					</div>
				</button>
			</div>
			
			<p class="text-gray-600 dark:text-gray-400 mt-8 text-sm">
				No credit card required • Start trading in 30 seconds
			</p>
		</div>
		
		<!-- Trust Section -->
		<div class="bg-gray-100 dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 text-center">
			<p class="text-gray-700 dark:text-gray-300 text-lg mb-4">
				<span class="font-bold text-gray-900 dark:text-white">Trade Responsibly.</span> This platform is designed to help you manage risk, 
				but all trading involves risk. Never invest more than you can afford to lose.
			</p>
			<p class="text-gray-600 dark:text-gray-400 text-sm">
				If you're experiencing financial stress, please reach out to mental health resources in your area.
			</p>
		</div>
	</div>
</div>

<style>
	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}
	
	.animate-blob {
		animation: blob 7s infinite;
	}
	
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	
	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>
