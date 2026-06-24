<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	const setActiveTab = getContext('setActiveTab') as (id: string) => void;
	const getNewTabId = getContext('getNewTabId') as () => string;
	const activeTab = getContext('activeTab') as Writable<string>;

	let className = '';
	export { className as class };

	export let buttonClass = '';
	export let value: string | undefined = undefined;
	export let href: string | undefined = undefined;
	const fallbackId = getNewTabId();
	$: id = value ?? fallbackId;
</script>

<li class={cn('mr-2', className)} role="presentation">
	{#if href}
		<a
			{href}
			on:click={() => setActiveTab(id)}
			class={cn(buttonClass)}
			id="{id}-tabhead"
			role="tab"
			aria-selected={$activeTab === id}
			style:opacity={$activeTab === id ? '100%' : '50%'}
		>
			<slot />
		</a>
	{:else}
		<button
			on:click={() => setActiveTab(id)}
			class={cn(buttonClass)}
			id="{id}-tabhead"
			type="button"
			role="tab"
			aria-selected={$activeTab === id}
			style:opacity={$activeTab === id ? '100%' : '50%'}
		>
			<slot />
		</button>
	{/if}
</li>
