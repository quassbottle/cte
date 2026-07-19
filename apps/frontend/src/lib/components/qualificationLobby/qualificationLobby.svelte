<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import MultiplayerScore from '$lib/components/multiplayerScore/multiplayerScore.svelte';
	import { getLobbySeats } from './qualificationLobby-view';

	export let lobby: QualificationLobbyDtoOutput;
	export let beatmaps: MappoolBeatmapDto[] = [];

	$: attemptsByBeatmap = Object.entries(
		lobby.attempts.reduce<Record<string, typeof lobby.attempts>>((groups, attempt) => {
			(groups[String(attempt.beatmapId)] ??= []).push(attempt);
			return groups;
		}, {})
	);
</script>

<article class="flex flex-col gap-3 rounded-md border border-border p-4">
	<header class="flex items-start justify-between gap-3">
		<div>
			<h3 class="font-semibold">Lobby {lobby.number}</h3>
			<p class="text-xs text-muted-foreground">
				{new Date(lobby.startsAt).toLocaleString()}–{new Date(lobby.endsAt).toLocaleTimeString()}
			</p>
			<p class="text-xs text-muted-foreground">Referee: {lobby.refereeName}</p>
		</div>
		<span class="rounded bg-muted px-2 py-1 text-xs font-medium">
			{lobby.syncStatus ?? 'not linked'}
		</span>
	</header>

	<p class="text-sm">{getLobbySeats(lobby.seatCount)}</p>
	{#if lobby.players.length}<p class="text-sm">
			{lobby.players.map(({ name }) => name).join(', ')}
		</p>{/if}
	{#if lobby.teams.length}<p class="text-sm">
			{lobby.teams.map(({ name }) => name).join(', ')}
		</p>{/if}
	{#if lobby.mpUrl}<a class="text-sm underline" href={lobby.mpUrl}>Multiplayer room</a>{/if}
	{#if lobby.lastSyncedAt}
		<p class="text-xs text-muted-foreground">
			Synced {new Date(lobby.lastSyncedAt).toLocaleString()}
		</p>
	{/if}

	{#if attemptsByBeatmap.length}
		<div class="space-y-2 text-sm">
			{#each attemptsByBeatmap as [beatmapId, attempts]}
				{@const beatmap = beatmaps.find(({ osuBeatmapId }) => osuBeatmapId === Number(beatmapId))}
				{#if beatmap}
					<MultiplayerScore
						result={{
							beatmap: {
								artist: beatmap.artist,
								title: beatmap.title,
								difficultyName: beatmap.difficultyName,
								beatmapsetId: beatmap.osuBeatmapsetId,
								beatmapId: beatmap.osuBeatmapId,
								mod: beatmap.mod,
								tournamentMode: beatmap.mode,
								index: beatmap.index,
								difficulty: beatmap.difficulty,
								deleted: beatmap.deleted
							},
							scores: attempts
						}}
					/>
				{:else}
					<div>
						<a class="font-medium underline" href={`https://osu.ppy.sh/b/${beatmapId}`}>
							Beatmap {beatmapId}
						</a>
						{#each attempts as attempt (`${attempt.gameId}-${attempt.osuUserId}`)}
							<p class="text-muted-foreground">
								{attempt.userName ?? `osu! ${attempt.osuUserId}`}: {attempt.score}
							</p>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<slot name="actions" />
</article>
