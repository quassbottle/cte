<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, OsuMode, StageDto } from '$lib/api/types';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import StageMappoolPanel from './StageMappoolPanel.svelte';

	export let tournamentMode: OsuMode;
	export let stages: StageDto[];
	export let mappools: MappoolDto[];
	export let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	export let form: TournamentEditActionResult | undefined;

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: sortedMappools = [...mappools].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: mappoolByStageId = new Map(sortedMappools.map((mappool) => [mappool.stageId, mappool]));
	$: beatmapsByMappoolId = new Map(
		mappoolBeatmaps.map((entry) => [entry.mappoolId, [...entry.beatmaps]])
	);
</script>

<div class="flex flex-col gap-3">
	{#if sortedStages.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup value={sortedStages[0]?.id} let:Head let:ContentItem class="flex flex-col gap-4">
			<Head let:Item class="flex flex-wrap gap-2">
				{#each sortedStages as stage}
					<Item
						value={stage.id}
						buttonClass={buttonVariants({
							variant: 'default',
							size: 'sm',
							className: 'w-fit justify-center'
						})}
					>
						{stage.name}
					</Item>
				{/each}
			</Head>

			{#each sortedStages as stage}
				{@const mappool = mappoolByStageId.get(stage.id)}
				<ContentItem value={stage.id}>
					<StageMappoolPanel
						{stage}
						{mappool}
						beatmaps={mappool ? (beatmapsByMappoolId.get(mappool.id) ?? []) : []}
						{tournamentMode}
						result={form}
					/>
				</ContentItem>
			{/each}
		</TabGroup>
	{/if}
</div>
