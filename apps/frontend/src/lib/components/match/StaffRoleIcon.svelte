<script lang="ts">
	import type { StageScheduleDtoOutputMatchesItemStaffItemRole } from '$lib/api/generated/model';
	import { Mic, Radio, ShieldCheck } from 'lucide-svelte';

	export let role: StageScheduleDtoOutputMatchesItemStaffItemRole;
	export let size = 4;

	$: label = role === 'referee' ? 'Referee' : role === 'streamer' ? 'Streamer' : 'Commentator';
	$: className = size === 3 ? 'h-3 w-3' : 'h-4 w-4';
</script>

<span class="text-muted-foreground" title={label} aria-label={label}>
	{#if role === 'referee'}
		<ShieldCheck class={className} />
	{:else if role === 'streamer'}
		<Radio class={className} />
	{:else}
		<Mic class={className} />
	{/if}
</span>
