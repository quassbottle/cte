<script>
	import { cn } from '$lib/utils';
	import Item from './tabHeadItem.svelte';

	let className = '';
	export { className as class };
</script>

<ul class={cn('flex flex-wrap', className)} role="tablist">
	<slot {Item} />
</ul>
