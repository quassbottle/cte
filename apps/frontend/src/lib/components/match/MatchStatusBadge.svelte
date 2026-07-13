<script lang="ts">
	import type { MatchDisplayStatus } from './types';

	export let status: MatchDisplayStatus;

	$: label = status.toUpperCase();
	$: colors =
		status === 'live'
			? 'text-emerald-400 before:bg-emerald-400'
			: status === 'finished'
				? 'text-muted-foreground before:bg-muted-foreground'
				: 'text-muted-foreground before:border before:border-muted-foreground';
</script>

<span
	class={`inline-flex items-center gap-1.5 text-[10px] font-semibold leading-none tracking-wide before:block before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-[''] ${colors}`}
>
	{label}
</span>
