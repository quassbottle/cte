<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import type { StageScheduleDtoOutput } from '$lib/api/generated/model';
	import Schedule from '$lib/components/schedule/schedule.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { onDestroy } from 'svelte';

	export let schedule: StageScheduleDtoOutput[];
	let timer: ReturnType<typeof setInterval> | undefined;
	$: regularSchedule = schedule.filter((stage) => stage.type !== 'qualification');

	$: hasActiveSync = regularSchedule.some((stage) =>
		stage.matches.some((match) => match.syncStatus === 'active')
	);
	$: {
		if (browser && hasActiveSync && !timer) timer = setInterval(() => void invalidateAll(), 10_000);
		if (browser && !hasActiveSync && timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	onDestroy(() => timer && clearInterval(timer));

	$: requestedStageId = $page.url.searchParams.get('stage');
	$: activeStageId = getActiveStageId(requestedStageId);

	function getActiveStageId(value: string | null) {
		if (value && regularSchedule.some((stage) => stage.id === value)) {
			return value;
		}

		return regularSchedule[0]?.id ?? '';
	}

	function getStageTabHref(stageId: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', 'schedule');
		params.set('stage', stageId);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}
</script>

<div class="flex flex-col gap-3">
	{#if regularSchedule.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup
			value={activeStageId}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each regularSchedule as stage}
						<Item
							value={stage.id}
							href={getStageTabHref(stage.id)}
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
				{#each regularSchedule as stage}
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
