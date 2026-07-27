<script lang="ts">
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import type { MultiplayerScoreData } from './multiplayerScore';
	import PlayerMultiplayerScore from './playerMultiplayerScore.svelte';

	const { result }: { result: MultiplayerScoreData } = $props();
</script>

<section class="space-y-2">
	<Beatmap
		artist={result.beatmap.artist}
		title={result.beatmap.title}
		difficultyName={result.beatmap.difficultyName}
		beatmapsetId={result.beatmap.beatmapsetId}
		beatmapId={result.beatmap.beatmapId}
		mod={result.beatmap.mod}
		tournamentMode={result.beatmap.tournamentMode}
		index={result.beatmap.index}
		difficulty={result.beatmap.difficulty}
		deleted={result.beatmap.deleted}
	/>
	{#if result.standings?.length}
		<div class="flex flex-wrap justify-end gap-3 text-sm">
			{#each result.standings as standing}
				<p>
					{standing.name}:
					<strong>{standing.score.toLocaleString()}</strong>
					<span class="text-muted-foreground">· #{standing.place}</span>
				</p>
			{/each}
		</div>
	{/if}
	{#each result.scores as score}
		<PlayerMultiplayerScore {score} />
	{/each}
</section>
