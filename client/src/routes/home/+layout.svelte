<script>
	import '../../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Reactive Portfolio - Intelligent Automated Trading</title>
</svelte:head>

<div class="contents">
	{@render children?.()}
</div>

<style>
	:global(body) {
		background: transparent !important;
	}
</style>
