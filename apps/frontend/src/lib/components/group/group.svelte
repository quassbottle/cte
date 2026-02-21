<script lang="ts">
	import Title from './groupTitle.svelte';
	import Content from './groupContent.svelte';
	import { cn } from '$lib/utils';

	let className: string = '';
	export { className as class };
</script>

<div class={cn('flex flex-col gap-4', className)}>
	<slot {Title} {Content} />
</div>
