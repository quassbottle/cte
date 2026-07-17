<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { GripVertical } from 'lucide-svelte';
	import { dragHandle } from 'svelte-dnd-action';

	export let mappool: MappoolDto;
	export let beatmap: MappoolBeatmapDto;
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;
	export let dragDisabled = false;

	const normalizeMod = (value: string) => value.trim().toUpperCase();
	$: rowError =
		result &&
		!result.ok &&
		result.mappoolId === mappool.id &&
		result.beatmapId === String(beatmap.osuBeatmapId) &&
		(result.action === 'updateMappoolBeatmap' ||
			result.action === 'replaceMappoolBeatmap' ||
			result.action === 'deleteMappoolBeatmap')
			? result
			: undefined;
</script>

<div class="relative rounded-md border border-border p-2 pl-10">
	<button
		type="button"
		class="absolute left-2 top-3 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
		disabled={dragDisabled}
		aria-label="Drag to reorder map"
		use:dragHandle
	>
		<GripVertical class="h-5 w-5" />
	</button>
	<Beatmap
		difficultyName={beatmap.difficultyName}
		artist={beatmap.artist}
		title={beatmap.title}
		beatmapsetId={beatmap.osuBeatmapsetId}
		beatmapId={beatmap.osuBeatmapId}
		mod={normalizeMod(beatmap.mod)}
		{tournamentMode}
		index={beatmap.index}
		difficulty={beatmap.difficulty}
		deleted={beatmap.deleted}
	/>

	<div class="mt-2 flex flex-wrap items-end gap-2 px-2 pb-2">
		<form
			method="post"
			action="?/updateMappoolBeatmap"
			class="flex flex-wrap items-end gap-2"
			use:enhance
		>
			<input type="hidden" name="mappoolId" value={mappool.id} />
			<input type="hidden" name="osuBeatmapId" value={beatmap.osuBeatmapId} />
			<div class="flex w-[140px] flex-col gap-1">
				<Label for={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}>Mod</Label>
				<Input
					id={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}
					name="mod"
					value={normalizeMod(beatmap.mod)}
				/>
			</div>
			<div class="flex w-[140px] flex-col gap-1">
				<Label for={`beatmap-index-${mappool.id}-${beatmap.osuBeatmapId}`}>Index</Label>
				<Input
					id={`beatmap-index-${mappool.id}-${beatmap.osuBeatmapId}`}
					name="index"
					type="number"
					min="1"
					value={beatmap.index}
				/>
			</div>
			<Button size="sm" variant="outline" type="submit">Update slot</Button>
		</form>

		<form
			method="post"
			action="?/replaceMappoolBeatmap"
			class="flex flex-wrap items-end gap-2"
			use:enhance
		>
			<input type="hidden" name="mappoolId" value={mappool.id} />
			<input type="hidden" name="osuBeatmapId" value={beatmap.osuBeatmapId} />
			<div class="flex w-[160px] flex-col gap-1">
				<Label for={`beatmap-replace-id-${mappool.id}-${beatmap.osuBeatmapId}`}>Beatmap id</Label>
				<Input
					id={`beatmap-replace-id-${mappool.id}-${beatmap.osuBeatmapId}`}
					name="beatmapId"
					type="number"
					min="1"
					value={beatmap.osuBeatmapId}
				/>
			</div>
			<Button size="sm" variant="outline" type="submit">Replace map</Button>
		</form>

		<form method="post" action="?/deleteMappoolBeatmap" use:enhance>
			<input type="hidden" name="mappoolId" value={mappool.id} />
			<input type="hidden" name="osuBeatmapId" value={beatmap.osuBeatmapId} />
			<Button size="sm" variant="destructive" type="submit">Delete map</Button>
		</form>
	</div>

	{#if rowError}
		<p class="mt-2 text-sm text-destructive">{rowError.message}</p>
	{/if}
</div>
