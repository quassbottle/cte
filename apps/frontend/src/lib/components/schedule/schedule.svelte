<script lang="ts">
	import type {
		MatchHistoryDtoOutput,
		StageScheduleDtoOutputMatchesItem
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import Match from '$lib/components/match/match.svelte';
	import MatchCard from '$lib/components/match/MatchCard.svelte';
	import MultiplayerHistory from '$lib/components/multiplayerHistory/MultiplayerHistory.svelte';
	import MultiplayerHistoryDialog from '$lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte';
	import type { MultiplayerHistoryData } from '$lib/components/multiplayerHistory/multiplayerHistory';
	import { Button } from '$lib/components/ui/button';
	import ScheduleTable from './ScheduleTable.svelte';
	import { toMatchHistory } from './match-history';
	import { toMatchView } from './schedule-view';

	export let matches: StageScheduleDtoOutputMatchesItem[];
	export let canEdit = false;
	export let tournamentId: string | null = null;
	export let beatmaps: MappoolBeatmapDto[] = [];

	$: viewMatches = matches.map(toMatchView);

	let selectedMatch: StageScheduleDtoOutputMatchesItem | null = null;
	let history: MultiplayerHistoryData | null = null;
	let loading = false;
	let historyError: string | null = null;
	let request: AbortController | null = null;

	async function openHistory(match: StageScheduleDtoOutputMatchesItem) {
		if (!tournamentId || !match.lastSyncedAt) return;

		request?.abort();
		const controller = new AbortController();
		request = controller;
		selectedMatch = match;
		history = null;
		historyError = null;
		loading = true;

		try {
			const response = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/history`, {
				signal: controller.signal
			});
			if (!response.ok) throw new Error('Unable to load match history');
			history = toMatchHistory((await response.json()) as MatchHistoryDtoOutput, beatmaps);
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				historyError = error instanceof Error ? error.message : 'Unable to load match history';
			}
		} finally {
			if (request === controller) loading = false;
		}
	}

	function closeHistory() {
		request?.abort();
		request = null;
		selectedMatch = null;
		history = null;
		historyError = null;
		loading = false;
	}
</script>

<ScheduleTable>
	<svelte:fragment slot="header">
		<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
			<tr>
				<th class="w-16 px-4 py-3 font-semibold">ID</th>
				<th class="w-40 px-4 py-3 font-semibold">Time</th>
				<th class="px-4 py-3 font-semibold">Player 1</th>
				<th class="w-32 px-4 py-3 text-center font-semibold">Score</th>
				<th class="px-4 py-3 text-right font-semibold">Player 2</th>
				<th class="w-56 px-4 py-3 font-semibold">Staff</th>
				<th class="w-16 px-4 py-3 text-center font-semibold">MP</th>
				<th class="w-16 px-4 py-3 text-center font-semibold">VOD</th>
				{#if canEdit}
					<th class="w-36 px-4 py-3 text-right font-semibold">Actions</th>
				{:else if tournamentId}
					<th class="w-24 px-4 py-3 text-right font-semibold">Actions</th>
				{/if}
			</tr>
		</thead>
	</svelte:fragment>
	<svelte:fragment slot="rows">
		<tbody>
			{#each viewMatches as match, index}
				<Match {match} editable={canEdit} hasActions={Boolean(tournamentId)}>
					<svelte:fragment slot="actions">
						{#if tournamentId}
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!matches[index].lastSyncedAt}
								on:click={() => openHistory(matches[index])}
							>
								Open
							</Button>
						{/if}
						<slot name="actions" match={matches[index]} />
					</svelte:fragment>
				</Match>
			{/each}
		</tbody>
	</svelte:fragment>
	<svelte:fragment slot="mobile">
		{#each viewMatches as match, index}
			<div>
				<MatchCard {match} />
				{#if canEdit || tournamentId}
					<div class="flex justify-end gap-2 border-t border-border p-4">
						{#if tournamentId}
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!matches[index].lastSyncedAt}
								on:click={() => openHistory(matches[index])}
							>
								Open
							</Button>
						{/if}
						<slot name="actions" match={matches[index]} />
					</div>
				{/if}
			</div>
		{/each}
	</svelte:fragment>
</ScheduleTable>

{#if selectedMatch}
	<MultiplayerHistoryDialog onClose={closeHistory}>
		<article class="space-y-4 p-4">
			<header class="pr-12">
				<h3 class="font-semibold">{selectedMatch.name}</h3>
				{#if selectedMatch.mpUrl}
					<a class="text-sm underline" href={selectedMatch.mpUrl}>Multiplayer room</a>
				{/if}
				{#if selectedMatch.lastSyncedAt}
					<p class="text-xs text-muted-foreground">
						Synced {new Date(selectedMatch.lastSyncedAt).toLocaleString()}
					</p>
				{/if}
			</header>
			{#if loading}
				<p class="py-8 text-center text-sm text-muted-foreground">Loading history…</p>
			{:else if historyError}
				<p class="py-8 text-center text-sm text-destructive">{historyError}</p>
			{:else if history}
				<MultiplayerHistory {history} />
			{/if}
		</article>
	</MultiplayerHistoryDialog>
{/if}
