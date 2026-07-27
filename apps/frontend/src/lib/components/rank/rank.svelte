<script lang="ts">
	import { cn } from '$lib/utils';
	import { getRankDisplay } from './rank';

	const { rank, class: className }: { rank: string; class?: string } = $props();
	const display = $derived(getRankDisplay(rank));
</script>

<span
	class={cn(
		'min-w-12 select-none rounded-full px-3 py-1 text-center font-bold',
		display.className,
		className
	)}
>
	{display.label}
</span>
