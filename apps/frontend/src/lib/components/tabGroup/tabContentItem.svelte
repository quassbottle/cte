<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	const activeTab = getContext('activeTab') as Writable<string>;
	const getNewContentId = getContext('getNewContentId') as () => string;

	let className = '';
	export { className as class };
	export let value: string | undefined = undefined;
	const fallbackId = getNewContentId();
	$: id = value ?? fallbackId;
</script>

{#if $activeTab === id}
	<div class={cn(className)} role="tabpanel" aria-labelledby="{id}-tabhead">
		<slot />
	</div>
{/if}
