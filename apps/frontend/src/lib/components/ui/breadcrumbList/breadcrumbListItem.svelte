<script lang="ts">
	import { cn } from '$lib/utils';
	let className: string = '';
	export { className as class };
</script>

<li class={cn('inline-flex items-center gap-1', className)}>
	<slot></slot>
</li>
