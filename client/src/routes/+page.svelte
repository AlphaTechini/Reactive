<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	onMount(() => {
		// Redirect to the new home page
		goto('/home');
	});
</script>

<svelte:head>
	<title>Redirecting...</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
	<div class="text-center">
		<div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
		<p class="text-white text-xl">Loading...</p>
	</div>
</div>
