<script lang="ts">
	import { ExternalLink, Twitch } from 'lucide-svelte';

	export let href: string | null;
	export let type: 'mp' | 'vod';
</script>

{#if href}
	<a
		class="inline-flex text-primary hover:text-primary/80"
		{href}
		aria-label={type === 'mp' ? 'Open multiplayer lobby' : 'Open VOD'}
	>
		{#if type === 'mp'}
			<ExternalLink class="h-4 w-4" />
		{:else}
			<Twitch class="h-4 w-4" />
		{/if}
	</a>
{:else}
	<span class="text-muted-foreground">-</span>
{/if}
