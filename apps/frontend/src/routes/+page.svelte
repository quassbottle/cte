<script lang="ts">
	import Banner from '$lib/components/banner/banner.svelte';
	import Group from '$lib/components/group/group.svelte';
</script>

<svelte:head>
	<title>CTE - Home</title>
</svelte:head>

<div class="flex flex-col gap-16">
	<Banner class="h-[300px] bg-[#2c2c2c] text-white" let:Title let:Description>
		<Title>Welcome to CTE tournaments!</Title>
		<Description>Sample text xd</Description>
	</Banner>

	<Group let:Title let:Content>
		<Title class="select-none">Upcoming tournaments</Title>
		<Content class="flex flex-col gap-3">
			<p>There are no upcoming tournaments.</p>
		</Content>
	</Group>
</div>
