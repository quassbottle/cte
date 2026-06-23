<script lang="ts">
	import { cn } from '$lib/utils';
	import { writable, type Writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import Head from './tabHead.svelte';
	import ContentItem from './tabContentItem.svelte';

	let className = '';
	export { className as class };

	export let value: string | undefined = undefined;
	export let onValueChange: ((value: string) => void) | undefined = undefined;

	const activeTab: Writable<string> = writable(value ?? '1');

	$: if (value !== undefined) {
		activeTab.set(value);
	}

	function setActiveTab(id: string) {
		value = id;
		activeTab.set(id);
		onValueChange?.(id);
	}

	let tabCounter = 0;
	function getNewTabId() {
		return String(++tabCounter);
	}

	let contentCounter = 0;
	function getNewContentId() {
		return String(++contentCounter);
	}

	setContext('activeTab', activeTab);
	setContext('setActiveTab', setActiveTab);
	setContext('getNewTabId', getNewTabId);
	setContext('getNewContentId', getNewContentId);
</script>

<div class={cn(className)}>
	<slot {Head} {ContentItem} />
</div>
