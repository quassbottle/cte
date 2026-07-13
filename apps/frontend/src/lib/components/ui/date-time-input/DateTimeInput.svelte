<script lang="ts">
	import { cn } from '$lib/utils';
	import { Calendar } from 'lucide-svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type $$Props = Omit<HTMLInputAttributes, 'type'>;

	let className: $$Props['class'] = undefined;
	export let value: $$Props['value'] = undefined;
	export { className as class };
</script>

<div class="relative w-full">
	<input
		{...$$restProps}
		type="datetime-local"
		bind:value
		class={cn(
			'date-time-input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]',
			className
		)}
	/>
	<Calendar
		class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
	/>
</div>

<style>
	.date-time-input::-webkit-calendar-picker-indicator {
		position: absolute;
		right: 0;
		width: 2.5rem;
		height: 100%;
		cursor: pointer;
		opacity: 0;
	}
</style>
