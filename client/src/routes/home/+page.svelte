<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { serverWarmup } from '$lib/services/serverWarmup.js';
	
	let isVisible = false;
	
	onMount(() => {
		isVisible = true;
		serverWarmup.warmupInBackground();
	});
	
	async function goToSimulation() {
		serverWarmup.warmupInBackground();
		goto('/simulated');
	}
	
	function goToLive() {
		// Disabled for now - coming soon
	}
</script>

<div class="min-h-screen bg-[#0b0b0b] text-[#f5f5f3] overflow-hidden">
	<!-- Header -->
	<header class="relative z-20 px-4 sm:px-6 lg:px-8 py-6">
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-3">
				<img src="/logo.png" alt="Reactive Portfolio" class="w-10 h-10 rounded-lg shadow-lg shadow-[#d4af37]/20" />
				<h1 class="text-2xl font-bold text-[#f5f5f3]">Reactive Portfolio</h1>
			</div>
		</div>
	</header>

	<!-- Premium Gold Background Elements -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<!-- Large ambient gold glows -->
		<div class="absolute top-20 left-10 w-96 h-96 bg-[#d4af37] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.05]"></div>
		<div class="absolute bottom-20 right-10 w-96 h-96 bg-[#c9a227] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.05]"></div>
		<!-- Decorative gold coin elements -->
		<div class="absolute top-32 right-[15%] w-20 h-20 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.12] shadow-lg"></div>
		<div class="absolute top-48 right-[8%] w-12 h-12 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.10]"></div>
		<div class="absolute top-24 left-[12%] w-16 h-16 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.10]"></div>
		<div class="absolute bottom-40 left-[18%] w-14 h-14 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.08]"></div>
		<div class="absolute bottom-32 right-[22%] w-10 h-10 rounded-full bg-gradient-to-br from-[#e8c84a] via-[#d4af37] to-[#a68523] opacity-[0.08]"></div>
		<!-- Subtle gold pattern lines -->
		<div class="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent"></div>
		<div class="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/8 to-transparent"></div>
	</div>
	
	<div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Hero Section with Layered Readability -->
		<div class="text-center mb-20 pt-12 relative" class:opacity-0={!isVisible} class:translate-y-10={!isVisible} class:opacity-100={isVisible} class:translate-y-0={isVisible} style="transition: all 0.8s ease-out;">
			<!-- Layer 1: Localized Backdrop Blur (behind text only) -->
			<div class="absolute inset-0 -mx-8 -my-4 backdrop-blur-[2px] rounded-3xl pointer-events-none" style="mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 70%);"></div>
			
			<!-- Layer 2: Gradient Contrast Mask -->
			<div class="absolute inset-0 -mx-12 -my-8 rounded-3xl pointer-events-none" style="background: radial-gradient(ellipse 65% 55% at 50% 40%, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.20) 40%, transparent 70%);"></div>
			
			<!-- Hero Content with Typography Reinforcement -->
			<div class="relative z-10">
				<h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
					<span class="text-[#faf9f7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" style="text-shadow: 0 1px 2px rgba(0,0,0,0.25); -webkit-text-stroke: 0.5px rgba(250,249,247,0.15);">Stop Losing Money.</span>
					<br />
					<span class="bg-gradient-to-r from-[#e8c84a] via-[#f4d03f] to-[#ffd700] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));">Start Trading Smart.</span>
				</h1>
				
				<p class="text-lg md:text-xl text-[#1a1a1a] mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)]" style="text-shadow: 0 1px 1px rgba(255,255,255,0.05);">
					Automated portfolio management that protects your wealth with intelligent stop-loss, 
					take-profit, and auto-rebalancing strategies.
				</p>
				
				<div class="inline-block bg-[#1a1a1a]/90 border border-[#333] rounded-xl px-6 py-4 mb-12 backdrop-blur-sm">
					<p class="text-sm text-[#d0d0cc]" style="text-shadow: 0 1px 1px rgba(0,0,0,0.1);">
						⚠️ Trading involves risk. Our platform helps you trade responsibly with automated risk management.
					</p>
				</div>
			</div>
		</div>
		
		<!-- Value Propositions -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
			<div class="bg-[#141414] rounded-xl p-6 border border-[#262626] hover:border-[#d4af37]/30 transition-all duration-300 group">
				<div class="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/10">
					<svg class="w-6 h-6 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
				</div>
				<h3 class="text-xl font-bold mb-3 text-[#f5f5f3] group-hover:text-[#d4af37] transition-colors">Protect Your Capital</h3>
				<p class="text-[#787874] leading-relaxed text-sm">
					Automated stop-loss triggers prevent catastrophic losses. Sleep peacefully knowing your investments are protected 24/7.
				</p>
			</div>
			
			<div class="bg-[#141414] rounded-xl p-6 border border-[#262626] hover:border-[#d4af37]/30 transition-all duration-300 group">
				<div class="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/10">
					<svg class="w-6 h-6 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<h3 class="text-xl font-bold mb-3 text-[#f5f5f3] group-hover:text-[#d4af37] transition-colors">Maximize Profits</h3>
				<p class="text-[#787874] leading-relaxed text-sm">
					Smart take-profit strategies lock in gains automatically. Never miss an opportunity to secure your returns.
				</p>
			</div>
			
			<div class="bg-[#141414] rounded-xl p-6 border border-[#262626] hover:border-[#d4af37]/30 transition-all duration-300 group">
				<div class="w-12 h-12 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/10">
					<svg class="w-6 h-6 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<h3 class="text-xl font-bold mb-3 text-[#f5f5f3] group-hover:text-[#d4af37] transition-colors">Auto-Rebalancing</h3>
				<p class="text-[#787874] leading-relaxed text-sm">
					Maintain optimal portfolio allocation effortlessly. Our algorithms keep your strategy on track without manual intervention.
				</p>
			</div>
		</div>
		
		<!-- Stats Section -->
		<div class="bg-[#141414] rounded-2xl p-8 md:p-12 mb-20 border border-[#262626]">
			<h2 class="text-2xl md:text-3xl font-bold text-center mb-10 text-[#f5f5f3]">Why Automated Risk Management Matters</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
				<div>
					<div class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#c9a227] to-[#e8c84a] bg-clip-text text-transparent mb-2">
						78%
					</div>
					<p class="text-[#787874] text-sm">
						of retail traders lose money due to poor risk management
					</p>
				</div>
				<div>
					<div class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#c9a227] to-[#e8c84a] bg-clip-text text-transparent mb-2">
						24/7
					</div>
					<p class="text-[#787874] text-sm">
						protection with automated monitoring and execution
					</p>
				</div>
				<div>
					<div class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#c9a227] to-[#e8c84a] bg-clip-text text-transparent mb-2">
						0ms
					</div>
					<p class="text-[#787874] text-sm">
						emotional decision-making with algorithmic precision
					</p>
				</div>
			</div>
		</div>
		
		<!-- Features Grid -->
		<div class="mb-20">
			<h2 class="text-2xl md:text-3xl font-bold text-center mb-10 text-[#f5f5f3]">Built for Serious Traders</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="bg-[#141414] rounded-xl p-5 border border-[#262626] hover:border-[#333] transition-colors">
					<div class="flex items-start gap-4">
						<div class="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-5 h-5 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<h3 class="text-base font-bold mb-1 text-[#f5f5f3]">Smart Stop-Loss</h3>
							<p class="text-[#787874] text-sm">Automatically convert to stablecoins when markets crash</p>
						</div>
					</div>
				</div>
				
				<div class="bg-[#141414] rounded-xl p-5 border border-[#262626] hover:border-[#333] transition-colors">
					<div class="flex items-start gap-4">
						<div class="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-5 h-5 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
							</svg>
						</div>
						<div>
							<h3 class="text-base font-bold mb-1 text-[#f5f5f3]">Take-Profit Automation</h3>
							<p class="text-[#787874] text-sm">Lock in gains at your target percentages automatically</p>
						</div>
					</div>
				</div>
				
				<div class="bg-[#141414] rounded-xl p-5 border border-[#262626] hover:border-[#333] transition-colors">
					<div class="flex items-start gap-4">
						<div class="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-5 h-5 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div>
							<h3 class="text-base font-bold mb-1 text-[#f5f5f3]">Portfolio Rebalancing</h3>
							<p class="text-[#787874] text-sm">Maintain target allocation as market conditions change</p>
						</div>
					</div>
				</div>
				
				<div class="bg-[#141414] rounded-xl p-5 border border-[#262626] hover:border-[#333] transition-colors">
					<div class="flex items-start gap-4">
						<div class="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#d4af37] rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="w-5 h-5 text-[#0b0b0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<div>
							<h3 class="text-base font-bold mb-1 text-[#f5f5f3]">Reactive Network</h3>
							<p class="text-[#787874] text-sm">Lightning-fast execution on decentralized infrastructure</p>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<!-- CTA Section -->
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-4xl font-bold mb-4 text-[#f5f5f3]">Ready to Trade Smarter?</h2>
			<p class="text-[#787874] mb-10 max-w-xl mx-auto">
				Practice risk-free in simulation mode or go live with real funds
			</p>
			
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
				<!-- Simulation Mode Button - Primary Gold CTA -->
				<button
					onclick={goToSimulation}
					class="group w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-[#c9a227] via-[#d4af37] to-[#e8c84a] hover:from-[#a68523] hover:via-[#c9a227] hover:to-[#d4af37] rounded-xl font-bold text-lg text-[#0b0b0b] transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-[#d4af37]/20 hover:shadow-xl hover:shadow-[#d4af37]/30"
				>
					<div class="flex flex-col items-center gap-1">
						<span>Start Simulation</span>
						<span class="text-xs font-normal opacity-80">$10,000 Virtual Funds</span>
					</div>
				</button>
				
				<!-- Live Mode Button (Disabled) -->
				<button
					disabled
					class="relative w-full sm:w-auto px-10 py-5 bg-[#1f1f1f] border border-[#333] rounded-xl font-bold text-lg text-[#5c5c58] cursor-not-allowed"
				>
					<div class="absolute -top-2 -right-2 bg-gradient-to-r from-[#c9a227] to-[#d4af37] text-[#0b0b0b] text-[10px] font-bold px-2 py-0.5 rounded-full">
						SOON
					</div>
					<div class="flex flex-col items-center gap-1">
						<span>Live Trading</span>
						<span class="text-xs font-normal opacity-60">Real Funds</span>
					</div>
				</button>
			</div>
			
			<p class="text-[#5c5c58] mt-6 text-xs">
				No credit card required • Start trading in 30 seconds
			</p>
		</div>
		
		<!-- Trust Section -->
		<div class="bg-[#141414] rounded-xl p-6 border border-[#262626] text-center">
			<p class="text-[#787874] text-sm">
				<span class="font-semibold text-[#c8c8c4]">Trade Responsibly.</span> This platform is designed to help you manage risk, 
				but all trading involves risk. Never invest more than you can afford to lose.
			</p>
		</div>
	</div>
</div>
