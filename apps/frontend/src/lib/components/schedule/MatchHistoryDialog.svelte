<script lang="ts">
	import type {
		MatchHistoryDtoOutput,
		StageScheduleDtoOutputMatchesItem
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import MultiplayerHistory from '$lib/components/multiplayerHistory/MultiplayerHistory.svelte';
	import MultiplayerHistoryDialog from '$lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte';
	import type { MultiplayerHistoryData } from '$lib/components/multiplayerHistory/multiplayerHistory';
	import { onMount } from 'svelte';
	import { toMatchHistory } from './match-history';

	export let tournamentId: string;
	export let match: StageScheduleDtoOutputMatchesItem;
	export let beatmaps: MappoolBeatmapDto[];
	export let onClose: () => void;

	let history: MultiplayerHistoryData | null = null;
	let error: string | null = null;

	onMount(async () => {
		try {
			const response = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/history`);
			if (!response.ok) throw new Error('Unable to load match history');
			history = toMatchHistory((await response.json()) as MatchHistoryDtoOutput, beatmaps);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to load match history';
		}
	});
</script>

<MultiplayerHistoryDialog {onClose}>
	<article class="space-y-4 p-4">
		<header class="pr-12">
			<h3 class="font-semibold">{match.name}</h3>
			{#if match.mpUrl}<a class="text-sm underline" href={match.mpUrl}>Multiplayer room</a>{/if}
		</header>
		{#if error}
			<p class="py-8 text-center text-sm text-destructive">{error}</p>
		{:else if history}
			<MultiplayerHistory {history} />
		{:else}
			<p class="py-8 text-center text-sm text-muted-foreground">Loading history…</p>
		{/if}
	</article>
</MultiplayerHistoryDialog>
