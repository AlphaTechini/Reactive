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
		transition: all 0.2s;
	}

	.mode-btn:hover {
		border-color: #667eea;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
	}

	.mode-btn.active {
		border-color: #667eea;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.icon {
		font-size: 2rem;
	}

	.label {
		font-weight: 600;
		font-size: 1.125rem;
	}

	.desc {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.mode-btn.active .desc {
		opacity: 0.9;
	}
</style>
