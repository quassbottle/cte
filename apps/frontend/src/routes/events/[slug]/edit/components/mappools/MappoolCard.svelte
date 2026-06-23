<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import MappoolBeatmapRow from './MappoolBeatmapRow.svelte';

	export let mappool: MappoolDto;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;

	$: visibilityError =
		result?.action === 'updateMappoolVisibility' && !result.ok && result.mappoolId === mappool.id
			? result
			: undefined;
</script>

<div class="border-border rounded-md border px-3 py-3">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs text-muted-foreground">Visibility: {mappool.hidden ? 'Hidden' : 'Visible'}</p>
		<form method="post" action="?/updateMappoolVisibility" use:enhance>
			<input type="hidden" name="mappoolId" value={mappool.id} />
			<input type="hidden" name="hidden" value={String(!mappool.hidden)} />
			<Button size="sm" variant="outline" type="submit">
				{mappool.hidden ? 'Show mappool' : 'Hide mappool'}
			</Button>
		</form>
	</div>

	{#if visibilityError}
		<p class="mt-2 text-sm text-red-400">{visibilityError.message}</p>
	{/if}

	<div class="mt-2 flex flex-col gap-2">
		{#if beatmaps.length === 0}
			<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
		{:else}
			{#each beatmaps as beatmap}
				<MappoolBeatmapRow {mappool} {beatmap} {tournamentMode} {result} />
			{/each}
		{/if}
	</div>
</div>
