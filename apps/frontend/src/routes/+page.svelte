<script lang="ts">
	import Banner from '$lib/components/banner/banner.svelte';
</script>

<svelte:head>
	<title>CTE - Home</title>
</svelte:head>

<div class="flex flex-col gap-16">
	<Banner class="bg-[#2c2c2c] text-white" let:Title let:Description>
		<Title>Welcome to CTE tournaments!</Title>
		<Description>Sample text xd</Description>
	</Banner>
</div>
