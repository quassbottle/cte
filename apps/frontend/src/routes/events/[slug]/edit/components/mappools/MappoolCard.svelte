<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { moveItem } from '$lib/utils/reorder';
	import { tick } from 'svelte';
	import MappoolBeatmapRow from './MappoolBeatmapRow.svelte';

	export let mappool: MappoolDto;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;

	let orderedBeatmaps = beatmaps;
	let draggedIndex: number | null = null;
	let pending = false;
	let error = '';
	let form: HTMLFormElement;
	let previousBeatmaps = beatmaps;

	$: orderedBeatmaps = beatmaps;

	function startDrag(event: DragEvent, index: number) {
		draggedIndex = index;
		event.dataTransfer?.setData('text/plain', String(index));
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	async function dropAt(index: number) {
		if (pending || draggedIndex === null) return;
		if (draggedIndex === index) {
			draggedIndex = null;
			return;
		}

		previousBeatmaps = orderedBeatmaps;
		orderedBeatmaps = moveItem(orderedBeatmaps, draggedIndex, index);
		draggedIndex = null;
		pending = true;
		error = '';
		await tick();
		form.requestSubmit();
	}
</script>

<form
	bind:this={form}
	method="post"
	action="?/reorderMappoolBeatmaps"
	use:enhance={() => {
		return async ({ result: actionResult, update }) => {
			if (actionResult.type !== 'success') {
				orderedBeatmaps = previousBeatmaps;
				error =
					actionResult.type === 'failure' && actionResult.data && 'message' in actionResult.data
						? String(actionResult.data.message)
						: 'Unable to save map order';
			}
			await update();
			pending = false;
		};
	}}
	class="hidden"
>
	<input type="hidden" name="mappoolId" value={mappool.id} />
	<input
		type="hidden"
		name="beatmapIds"
		value={JSON.stringify(orderedBeatmaps.map((beatmap) => beatmap.osuBeatmapId))}
	/>
</form>

<div class="flex flex-col gap-2" role="list">
	{#if orderedBeatmaps.length === 0}
		<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
	{:else}
		{#each orderedBeatmaps as beatmap, index (beatmap.osuBeatmapId)}
			<div
				role="listitem"
				class:opacity-60={draggedIndex === index}
				on:dragover|preventDefault
				on:drop|preventDefault={() => dropAt(index)}
			>
				<MappoolBeatmapRow
					{mappool}
					{beatmap}
					{tournamentMode}
					{result}
					dragDisabled={pending}
					onDragStart={(event) => startDrag(event, index)}
					onDragEnd={() => (draggedIndex = null)}
				/>
			</div>
		{/each}
	{/if}

	{#if pending}
		<p class="text-xs text-muted-foreground">Saving order…</p>
	{:else if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
