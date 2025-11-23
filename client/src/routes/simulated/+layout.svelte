<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { initSimulation, exitSimulation } from '$lib/stores/simulation';

	onMount(async () => {
		console.log('📍 Simulated Mode Active');
		
		// Initialize simulation mode
		initSimulation();
		
		// Initialize price service for simulation
		try {
			const { enhancedPriceDisplayService } = await import('$lib/services/EnhancedPriceDisplayService.js');
			await enhancedPriceDisplayService.initialize();
			await enhancedPriceDisplayService.fetchAllPrices();
			console.log('✅ Price service initialized for simulation');
		} catch (e) {
			console.error('❌ Failed to initialize price service:', e);
		}
	});

	onDestroy(() => {
		// Clean up simulation mode
		exitSimulation();
	});

	function exitSimulatedMode() {
		exitSimulation();
		goto('/');
	}
</script>

<div class="simulated-layout">
	<!-- Simulated Mode Banner -->
	<div class="simulated-banner">
		<div class="banner-content">
			<span class="badge">🧪 SIMULATION MODE</span>
			<span class="info">Using Local Hardhat Network</span>
			<button class="exit-btn" onclick={exitSimulatedMode}>Exit Simulation</button>
		</div>
	</div>

	<!-- Main Content -->
	<slot />
</div>

<style>
	.simulated-layout {
		min-height: 100vh;
	}

	.simulated-banner {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 0.75rem 1rem;
		position: sticky;
		top: 0;
		z-index: 1000;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.banner-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: space-between;
	}

	.badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.info {
		font-size: 0.875rem;
		opacity: 0.9;
	}

	.exit-btn {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.exit-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
