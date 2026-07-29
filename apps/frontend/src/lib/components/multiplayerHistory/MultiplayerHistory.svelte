<script lang="ts">
	import MultiplayerScore from '$lib/components/multiplayerScore/multiplayerScore.svelte';
	import {
		isHistoryTargetScore,
		type MultiplayerHistoryData,
		type MultiplayerHistoryTarget
	} from './multiplayerHistory';

	export let history: MultiplayerHistoryData;
	export let target: MultiplayerHistoryTarget | null = null;
</script>

{#if history.entries.length}
	<div class="space-y-2 text-sm">
		{#each history.entries as entry (`${entry.gameId}-${entry.beatmapId}`)}
			{#if entry.beatmap}
				<MultiplayerScore
					result={{
						beatmap: entry.beatmap,
						scores: entry.scores.map((score) => ({
							...score,
							gameId: score.gameId ?? entry.gameId,
							focused: isHistoryTargetScore(score, entry.gameId, target)
						})),
						standings: entry.standings
					}}
				/>
			{:else}
				<div>
					<a class="font-medium underline" href={`https://osu.ppy.sh/b/${entry.beatmapId}`}>
						Beatmap {entry.beatmapId}
					</a>
					{#each entry.scores as score}
						<p class="text-muted-foreground">
							{score.userName ?? `osu! ${score.osuUserId}`}: {score.score}
						</p>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
{:else}
	<p class="py-8 text-center text-sm text-muted-foreground">No synchronized games yet.</p>
{/if}
