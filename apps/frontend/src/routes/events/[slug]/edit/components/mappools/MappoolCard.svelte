<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import MappoolBeatmapRow from './MappoolBeatmapRow.svelte';

	export let mappool: MappoolDto;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;
</script>

<div class="flex flex-col gap-2">
	{#if beatmaps.length === 0}
		<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
	{:else}
		{#each beatmaps as beatmap}
			<MappoolBeatmapRow {mappool} {beatmap} {tournamentMode} {result} />
		{/each}
	{/if}
</div>
