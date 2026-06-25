<script lang="ts">
	import MatchLink from './MatchLink.svelte';

	export let mpUrl: string | null;
	export let vodUrl: string | null;
</script>

<div class="flex gap-3">
	{#if mpUrl}
		<MatchLink href={mpUrl} type="mp" />
	{/if}

	{#if vodUrl}
		<MatchLink href={vodUrl} type="vod" />
	{/if}
</div>
