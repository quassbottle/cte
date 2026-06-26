<script lang="ts">
	import type { MatchPlayerView } from './types';
	import { Hash } from 'lucide-svelte';
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

	export let player: MatchPlayerView | null;
	export let side: 'left' | 'right' = 'left';
	export let compact = false;

	const getInitials = (name: string) =>
		name
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
</script>

{#if player}
	<div
		class:justify-end={side === 'right'}
		class:text-right={side === 'right'}
		class="flex items-center gap-3"
	>
		{#if side === 'left'}
			<a class="shrink-0" href="/users/{player.id}" aria-label="Open {player.name} profile">
				<Avatar
					class={compact
						? 'h-10 w-10 cursor-pointer rounded-md'
						: 'h-11 w-11 cursor-pointer rounded-md'}
				>
					<AvatarImage src={getAvatarUrlByOsuId(player.osuId)} />
					<AvatarFallback>{getInitials(player.name)}</AvatarFallback>
				</Avatar>
			</a>
		{/if}

		<div class="min-w-0">
			<p class="truncate font-semibold">{player.name}</p>
			<p
				class:justify-end={side === 'right'}
				class="flex items-center gap-1 text-xs text-muted-foreground"
			>
				{#if side === 'right'}
					<Hash class="h-3 w-3 text-amber-500" />
					{player.seed ?? '-'}
					{player.country ?? ''}
				{:else}
					{player.country ?? ''}
					<Hash class="h-3 w-3 text-amber-500" />
					{player.seed ?? '-'}
				{/if}
			</p>
		</div>

		{#if side === 'right'}
			<a class="shrink-0" href="/users/{player.id}" aria-label="Open {player.name} profile">
				<Avatar
					class={compact
						? 'h-10 w-10 cursor-pointer rounded-md'
						: 'h-11 w-11 cursor-pointer rounded-md'}
				>
					<AvatarImage src={getAvatarUrlByOsuId(player.osuId)} />
					<AvatarFallback>{getInitials(player.name)}</AvatarFallback>
				</Avatar>
			</a>
		{/if}
	</div>
{:else}
	<div class:text-right={side === 'right'} class="text-sm text-muted-foreground">TBD</div>
{/if}
