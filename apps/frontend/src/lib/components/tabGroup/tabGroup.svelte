<script lang="ts">
	import { cn } from '$lib/utils';
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import Head from './tabHead.svelte';
	import ContentItem from './tabContentItem.svelte';

	let className = '';
	export { className as class };

	const activeTab = writable(1);

	function setActiveTab(id: number) {
		activeTab.set(id);
	}

	let tabCounter = 0;
	function getNewTabId() {
		return ++tabCounter;
	}

	let contentCounter = 0;
	function getNewContentId() {
		return ++contentCounter;
	}

	setContext('activeTab', activeTab);
	setContext('setActiveTab', setActiveTab);
	setContext('getNewTabId', getNewTabId);
	setContext('getNewContentId', getNewContentId);
</script>

<div class={cn(className)}>
	<slot {Head} {ContentItem} />
</div>
