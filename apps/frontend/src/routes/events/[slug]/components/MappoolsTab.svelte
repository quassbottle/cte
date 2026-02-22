<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, StageDto } from '$lib/api/types';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';

	export let stages: StageDto[];
	export let mappools: MappoolDto[];
	export let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: sortedMappools = [...mappools].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: mappoolsByStageId = new Map(
		sortedStages.map((stage) => [stage.id, sortedMappools.filter((mappool) => mappool.stageId === stage.id)])
	);
	$: beatmapsByMappoolId = new Map(
		mappoolBeatmaps.map((entry) => [
			entry.mappoolId,
			[...entry.beatmaps]
		])
	);

	const getStageMappools = (stageId: string) => mappoolsByStageId.get(stageId) ?? [];
</script>

<div class="flex flex-col gap-3">
	{#if sortedStages.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup let:Head let:ContentItem class="flex flex-col gap-4 md:flex-row">
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each sortedStages as stage}
						<Item
							class="mr-0"
							buttonClass={buttonVariants({
								variant: 'default',
								size: 'sm',
								className: 'w-full justify-center'
							})}
						>
							{stage.name}
						</Item>
					{/each}
				</Head>
			</div>

			<div class="min-w-0 flex-1 md:border-l md:border-border md:pl-6">
				{#each sortedStages as stage}
					<ContentItem class="flex flex-col gap-4">
						{#if getStageMappools(stage.id).length === 0}
							<p class="text-sm text-muted-foreground">Mappool has not been added yet.</p>
						{:else}
							{#each getStageMappools(stage.id) as mappool}
								<div class="flex flex-col gap-2">
									{#if (beatmapsByMappoolId.get(mappool.id) ?? []).length === 0}
										<p class="text-sm text-muted-foreground">No maps in this mappool.</p>
									{:else}
										{#each beatmapsByMappoolId.get(mappool.id) ?? [] as beatmap}
											<Beatmap
												difficultyName={beatmap.difficultyName}
												artist={beatmap.artist}
												title={beatmap.title}
												beatmapsetId={beatmap.osuBeatmapsetId}
												beatmapId={beatmap.osuBeatmapId}
												mod={beatmap.mod}
												index={beatmap.index}
												difficulty={beatmap.difficulty}
												deleted={beatmap.deleted}
											/>
										{/each}
									{/if}
								</div>
							{/each}
						{/if}
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>
