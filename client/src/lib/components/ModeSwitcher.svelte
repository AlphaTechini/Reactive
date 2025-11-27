<script>
	import { goto } from '$app/navigation';

	export let currentMode = 'live'; // 'live' or 'simulated'

	function switchToSimulated() {
		goto('/simulated');
	}

	function switchToLive() {
		goto('/');
	}
</script>

<div class="mode-switcher">
	<button
		class="mode-btn"
		class:active={currentMode === 'live'}
		onclick={switchToLive}
		aria-label="Switch to Live Mode"
	>
		<span class="icon">🔴</span>
		<span class="label">Live Mode</span>
		<span class="desc">Reactive Testnet</span>
	</button>

	<button
		class="mode-btn"
		class:active={currentMode === 'simulated'}
		onclick={switchToSimulated}
		aria-label="Switch to Simulation Mode"
	>
		<span class="icon">🧪</span>
		<span class="label">Simulation Mode</span>
		<span class="desc">Local Hardhat</span>
	</button>
</div>

<style>
	.mode-switcher {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	@media (prefers-color-scheme: dark) {
		.mode-switcher {
			background: rgb(31, 41, 55);
		}
	}

	.mode-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		border: 2px solid #e0e0e0;
		border-radius: 0.75rem;
		background: white;
		cursor: pointer;
		transition: all 0.3s ease;
		color: #374151;
	}

	@media (prefers-color-scheme: dark) {
		.mode-btn {
			background: rgb(55, 65, 81);
			border-color: rgb(75, 85, 99);
			color: rgb(209, 213, 219);
		}
	}

	.mode-btn:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);
	}

	/* Live Mode - Deep Purple */
	.mode-btn:first-child.active {
		border-color: #764ba2;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		box-shadow: 0 8px 24px rgba(118, 75, 162, 0.4);
	}

	/* Simulation Mode - Lighter Purple */
	.mode-btn:last-child.active {
		border-color: #a78bfa;
		background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%);
		color: white;
		box-shadow: 0 8px 24px rgba(167, 139, 250, 0.4);
	}

	.mode-btn:hover:not(.active) {
		border-color: #a78bfa;
	}

	.icon {
		font-size: 2rem;
		transition: transform 0.3s ease;
	}

	.mode-btn:hover .icon {
		transform: scale(1.1);
	}

	.mode-btn.active .icon {
		transform: scale(1.15);
	}

	.label {
		font-weight: 700;
		font-size: 1.125rem;
		letter-spacing: 0.025em;
	}

	.desc {
		font-size: 0.875rem;
		opacity: 0.75;
		font-weight: 500;
	}

	.mode-btn.active .desc {
		opacity: 0.95;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.mode-switcher {
			flex-direction: column;
		}

		.mode-btn {
			padding: 1.25rem 1rem;
		}

		.icon {
			font-size: 1.75rem;
		}

		.label {
			font-size: 1rem;
		}

		.desc {
			font-size: 0.8125rem;
		}
	}
</style>
