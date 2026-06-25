<script>
	import { cn } from '$lib/utils';
	import Item from './tabHeadItem.svelte';

	let className = '';
	export { className as class };
</script>

<ul
	class={cn('flex min-w-0 flex-nowrap overflow-x-auto whitespace-nowrap', className)}
	role="tablist"
>
	<slot {Item} />
</ul>

<style>
	ul {
		scrollbar-width: none;
	}

	ul::-webkit-scrollbar {
		display: none;
	}
</style>
