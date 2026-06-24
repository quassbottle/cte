<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import BeatmapMetadataPreview from './BeatmapMetadataPreview.svelte';
	import { createBeatmapMetadataLookup } from './useBeatmapMetadata';

	export let mappool: MappoolDto;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;

	const normalizeMod = (value: string) => value.trim().toUpperCase();
	const metadataLookup = createBeatmapMetadataLookup();
	const metadataState = metadataLookup.state;

	let mod = 'NM';
	let beatmapId = '';

	$: normalizedMod = normalizeMod(mod || 'NM');
	$: previewIndex =
		beatmaps
			.filter((beatmap) => normalizeMod(beatmap.mod) === normalizedMod)
			.reduce((max, beatmap) => Math.max(max, beatmap.index), 0) + 1;
	$: addError =
		result?.action === 'addMappoolBeatmap' && !result.ok && result.mappoolId === mappool.id
			? result
			: undefined;
	$: metadataLookup.setBeatmapId(beatmapId);

	const enhanceAddBeatmap: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();

			if (result.type === 'success') {
				beatmapId = '';
				metadataLookup.reset();
			}
		};
	};
</script>

<form
	method="post"
	action="?/addMappoolBeatmap"
	class="flex flex-col gap-3"
	use:enhance={enhanceAddBeatmap}
>
	<p class="text-sm font-medium">Add map to mappool</p>
	<input type="hidden" name="mappoolId" value={mappool.id} />
	{#if $metadataState.status === 'loaded'}
		<input type="hidden" name="beatmapsetId" value={$metadataState.metadata.osuBeatmapsetId} />
	{/if}

	<div class="flex flex-col gap-4 md:flex-row">
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for={`mappool-mod-${mappool.id}`}>Mod</Label>
			<Input
				id={`mappool-mod-${mappool.id}`}
				name="mod"
				placeholder="NM, HD, HR..."
				bind:value={mod}
				required
			/>
		</div>
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for={`beatmap-id-${mappool.id}`}>Beatmap id</Label>
			<Input
				id={`beatmap-id-${mappool.id}`}
				name="beatmapId"
				type="number"
				min="1"
				bind:value={beatmapId}
				required
			/>
		</div>
	</div>

	{#if $metadataState.status === 'loading'}
		<p class="text-xs text-muted-foreground">Loading beatmap metadata...</p>
	{/if}

	{#if $metadataState.status === 'error'}
		<p class="text-sm text-destructive">{$metadataState.message}</p>
	{/if}

	{#if $metadataState.status === 'loaded'}
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for={`beatmapset-id-${mappool.id}`}>Beatmapset id</Label>
			<Input
				id={`beatmapset-id-${mappool.id}`}
				type="number"
				min="1"
				readonly
				value={$metadataState.metadata.osuBeatmapsetId}
			/>
		</div>
		<BeatmapMetadataPreview
			metadata={$metadataState.metadata}
			mod={normalizedMod}
			index={previewIndex}
			{tournamentMode}
		/>
	{/if}

	{#if addError}
		<p class="text-sm text-destructive">{addError.message}</p>
	{/if}

	<div>
		<Button
			class="w-[180px] bg-accept text-[12px]"
			variant="accept"
			type="submit"
			disabled={$metadataState.status !== 'loaded'}
		>
			Add map to mappool
		</Button>
	</div>
</form>
