<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	let id: number;

	const activeTab = getContext('activeTab') as Writable<number>;
	const getNewContentId = getContext('getNewContentId') as () => number;

	let className = '';
	export { className as class };

	onMount(() => {
		id = getNewContentId();
	});
</script>

{#if $activeTab === id}
	<div class={cn(className)} role="tabpanel" aria-labelledby="{id}-tab">
		<slot />
	</div>
{/if}
