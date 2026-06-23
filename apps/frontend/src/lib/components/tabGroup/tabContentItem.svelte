<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	const activeTab = getContext('activeTab') as Writable<number>;
	const getNewContentId = getContext('getNewContentId') as () => number;
	const id = getNewContentId();

	let className = '';
	export { className as class };

</script>

{#if $activeTab === id}
	<div class={cn(className)} role="tabpanel" aria-labelledby="{id}-tabhead">
		<slot />
	</div>
{/if}
