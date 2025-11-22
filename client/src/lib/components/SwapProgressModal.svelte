<script>
	/**
	 * Swap Progress Modal
	 * Shows real-time progress of token swaps during portfolio creation
	 */
	
	export let isOpen = false;
	export let swaps = []; // Array of swap progress items
	export let totalProgress = 0;
	export let onClose = () => {};
	
	function getStatusIcon(status) {
		switch (status) {
			case 'pending':
				return '⏳';
			case 'swapping':
				return '🔄';
			case 'completed':
				return '✅';
			case 'error':
				return '❌';
			default:
				return '⏳';
		}
	}
	
	function getStatusColor(status) {
		switch (status) {
			case 'pending':
				return 'text-gray-500';
			case 'swapping':
				return 'text-blue-600 animate-pulse';
			case 'completed':
				return 'text-green-600';
			case 'error':
				return 'text-red-600';
			default:
				return 'text-gray-500';
		}
	}
	
	$: allCompleted = swaps.length > 0 && swaps.every(s => s.status === 'completed' || s.status === 'error');
	$: hasErrors = swaps.some(s => s.status === 'error');
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="p-6 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
							{#if allCompleted}
								{hasErrors ? 'Swaps Completed with Errors' : 'Swaps Completed Successfully'}
							{:else}
								Executing Token Swaps
							{/if}
						</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{#if allCompleted}
								All swaps have been processed
							{:else}
								Please wait while we execute your token swaps...
							{/if}
						</p>
					</div>
					{#if allCompleted}
						<button
							onclick={onClose}
							class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
						>
							<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>
			
			<!-- Progress Bar -->
			<div class="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Overall Progress
					</span>
					<span class="text-sm font-bold text-gray-900 dark:text-white">
						{Math.round(totalProgress)}%
					</span>
				</div>
				<div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div 
						class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
						style="width: {totalProgress}%"
					></div>
				</div>
			</div>
			
			<!-- Swap List -->
			<div class="p-6 overflow-y-auto max-h-96">
				<div class="space-y-3">
					{#each swaps as swap, index}
						<div class="flex items-start gap-4 p-4 rounded-lg border-2 transition-all {
							swap.status === 'completed' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
							swap.status === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
							swap.status === 'swapping' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' :
							'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
						}">
							<!-- Status Icon -->
							<div class="flex-shrink-0 text-2xl {getStatusColor(swap.status)}">
								{getStatusIcon(swap.status)}
							</div>
							
							<!-- Swap Details -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between mb-1">
									<h3 class="font-semibold text-gray-900 dark:text-white">
										{swap.token}
									</h3>
									{#if swap.allocation}
										<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
											{swap.allocation}%
										</span>
									{/if}
								</div>
								
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
									{swap.message || 'Waiting...'}
								</p>
								
								{#if swap.status === 'swapping'}
									<div class="flex items-center gap-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
										<span class="text-xs text-blue-600 dark:text-blue-400">Processing transaction...</span>
									</div>
								{/if}
								
								{#if swap.status === 'completed' && swap.transactionHash}
									<a 
										href="https://reactscan.net/tx/{swap.transactionHash}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
									>
										View transaction
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								{/if}
								
								{#if swap.status === 'error' && swap.error}
									<p class="text-xs text-red-600 dark:text-red-400 mt-1">
										Error: {swap.error}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Footer -->
			{#if allCompleted}
				<div class="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
					{#if hasErrors}
						<div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
							<div class="flex gap-2">
								<svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<div class="text-sm text-yellow-900 dark:text-yellow-100">
									<p class="font-medium mb-1">Some swaps failed</p>
									<p class="text-yellow-700 dark:text-yellow-300">
										Your portfolio was partially created. You can retry failed swaps later or adjust your allocations.
									</p>
								</div>
							</div>
						</div>
					{:else}
						<div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
							<div class="flex gap-2">
								<svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div class="text-sm text-green-900 dark:text-green-100">
									<p class="font-medium">All swaps completed successfully!</p>
									<p class="text-green-700 dark:text-green-300 mt-1">
										Your portfolio has been created with the specified allocations.
									</p>
								</div>
							</div>
						</div>
					{/if}
					
					<button
						onclick={onClose}
						class="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
					>
						{hasErrors ? 'Continue Anyway' : 'Continue to Portfolio'}
					</button>
				</div>
			{:else}
				<div class="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
					<div class="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
						<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
						<p class="text-sm font-medium">
							Please do not close this window or refresh the page
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
