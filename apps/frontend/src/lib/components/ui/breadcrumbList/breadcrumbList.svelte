<script lang="ts">
	import Item from './breadcrumbListItem.svelte';
	import './breadcrumbList.css';
	import { cn } from '$lib/utils';

	let className: string = '';

	export { className as class };
</script>

<ul class={cn('breadcrumb flex flex-row', className)}>
	<slot {Item}></slot>
</ul>
