<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	let id: number;

	const setActiveTab = getContext('setActiveTab') as (id: number) => void;
	const getNewTabId = getContext('getNewTabId') as () => number;
	const activeTab = getContext('activeTab') as Writable<number>;

	let className = '';
	export { className as class };

	export let buttonClass = '';

	onMount(() => {
		id = getNewTabId();
	});
</script>

<li class={cn('mr-2', className)} role="presentation">
	<button
		on:click={() => setActiveTab(id)}
		class={cn(buttonClass)}
		id="{id}-tabhead"
		type="button"
		role="tab"
		style:opacity={$activeTab === id ? '100%' : '50%'}
	>
		<slot />
	</button>
</li>
