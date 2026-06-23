<script lang="ts">
	import Group from '$lib/components/group/group.svelte';
	import Markdown from '$lib/components/markdown/markdown.svelte';

	export let value: string | null;
</script>

<Group let:Title let:Content>
	<Title>Rules</Title>
	<Content class="text-justify">
		{#if value?.trim()}
			<Markdown {value} />
		{:else}
			No rules provided.
		{/if}
	</Content>
</Group>
