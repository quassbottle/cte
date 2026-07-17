<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode } from '$lib/api/types';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { orderedBeatmapIds, withDndIds } from '$lib/utils/reorder';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';
	import { dragHandleZone, type DndEvent } from 'svelte-dnd-action';
	import MappoolBeatmapRow from './MappoolBeatmapRow.svelte';

	export let mappool: MappoolDto;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;

	type DndBeatmap = MappoolBeatmapDto & { id: number };
	const flipDurationMs = 180;

	let serverBeatmaps = withDndIds(beatmaps);
	let orderedBeatmaps = serverBeatmaps;
	let confirmedBeatmaps = serverBeatmaps;
	let pending = false;
	let error = '';
	let form: HTMLFormElement;

	$: serverBeatmaps = withDndIds(beatmaps);
	$: orderedBeatmaps = serverBeatmaps;
	$: confirmedBeatmaps = serverBeatmaps;

	function consider(event: CustomEvent<DndEvent<DndBeatmap>>) {
		orderedBeatmaps = event.detail.items;
	}

	async function finalize(event: CustomEvent<DndEvent<DndBeatmap>>) {
		orderedBeatmaps = event.detail.items;
		if (
			JSON.stringify(orderedBeatmapIds(orderedBeatmaps)) ===
			JSON.stringify(orderedBeatmapIds(confirmedBeatmaps))
		)
			return;

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
				orderedBeatmaps = confirmedBeatmaps;
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
		value={JSON.stringify(orderedBeatmapIds(orderedBeatmaps))}
	/>
</form>

{#if orderedBeatmaps.length === 0}
	<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
{:else}
	<div
		class="flex flex-col gap-2"
		role="list"
		use:dragHandleZone={{
			items: orderedBeatmaps,
			flipDurationMs,
			dragDisabled: pending,
			useCursorForDetection: true,
			delayTouchStart: 100
		}}
		on:consider={consider}
		on:finalize={finalize}
	>
		{#each orderedBeatmaps as beatmap (beatmap.id)}
			<div role="listitem" animate:flip={{ duration: flipDurationMs }}>
				<MappoolBeatmapRow {mappool} {beatmap} {tournamentMode} {result} dragDisabled={pending} />
			</div>
		{/each}
	</div>
{/if}

{#if pending}
	<p class="mt-2 text-xs text-muted-foreground">Saving order…</p>
{:else if error}
	<p class="mt-2 text-sm text-destructive">{error}</p>
{/if}

<style>
	:global(#dnd-action-dragged-el > *) {
		transform: rotate(-1deg) scale(1.015);
		border-radius: 0.375rem;
		box-shadow: 0 18px 40px rgb(0 0 0 / 35%);
	}
</style>
