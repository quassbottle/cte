<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import { getLobbySeats } from './qualificationLobby-view';

	export let lobby: QualificationLobbyDtoOutput;

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
				<div>
					<p class="font-medium">Beatmap {beatmapId}</p>
					<p class="text-muted-foreground">
						{attempts
							.map(
								(attempt) => `${attempt.userName ?? `osu! ${attempt.osuUserId}`}: ${attempt.score}`
							)
							.join(' · ')}
					</p>
				</div>
			{/each}
		</div>
	{/if}

	<slot name="actions" />
</article>
