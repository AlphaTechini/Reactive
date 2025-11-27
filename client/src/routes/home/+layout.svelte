<script>
	import '../../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Reactive Portfolio - Intelligent Automated Trading</title>
</svelte:head>

{@render children?.()}
