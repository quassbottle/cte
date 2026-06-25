<script lang="ts">
	import type { StageScheduleDtoOutput } from '$lib/api/generated/model';
	import Schedule from '$lib/components/schedule/schedule.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';

	export let schedule: StageScheduleDtoOutput[];
</script>

<div class="flex flex-col gap-3">
	{#if schedule.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup
			value={schedule[0]?.id}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each schedule as stage}
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
				{#each schedule as stage}
					<ContentItem class="flex flex-col gap-3" value={stage.id}>
						{#if stage.matches.length === 0}
							<p class="py-16 text-center text-sm text-muted-foreground">No matches added yet.</p>
						{:else}
							<Schedule matches={stage.matches} />
						{/if}
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>
