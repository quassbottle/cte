<script lang="ts">
	import type { StageDto } from '$lib/api/types';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';

	export let stages: StageDto[];

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
</script>

<div class="flex flex-col gap-3">
	{#if sortedStages.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup
			value={sortedStages[0]?.id}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each sortedStages as stage}
						<Item
							value={stage.id}
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
					<ContentItem value={stage.id}>
						<div class="rounded-md border border-border px-3 py-2">
							<p class="text-sm font-medium">{stage.name}</p>
							<p class="text-xs text-muted-foreground">
								{new Date(stage.startsAt).toLocaleString()} - {new Date(
									stage.endsAt
								).toLocaleString()}
							</p>
						</div>
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>
