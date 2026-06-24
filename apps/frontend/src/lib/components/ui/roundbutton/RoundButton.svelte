<script lang="ts">
	import Button from '../button/button.svelte';
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;
	export { className as class };
</script>

<Button
	variant="outline"
	size="icon"
	class={cn('rounded-full', className)}
	{...$$restProps}
	on:click
>
	<slot></slot>
</Button>
