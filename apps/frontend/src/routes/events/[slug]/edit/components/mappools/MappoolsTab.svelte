<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { MappoolBeatmapDto, MappoolDto, OsuMode, StageDto } from '$lib/api/types';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { Plus, X } from 'lucide-svelte';
	import AddBeatmapForm from './AddBeatmapForm.svelte';
	import CreateMappoolForm from './CreateMappoolForm.svelte';
	import MappoolCard from './MappoolCard.svelte';

	export let tournamentMode: OsuMode;
	export let stages: StageDto[];
	export let mappools: MappoolDto[];
	export let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	export let form: TournamentEditActionResult | undefined;

	let dialog:
		| {
				mode: 'create';
				stageId: string;
		  }
		| {
				mode: 'addBeatmap';
				mappool: MappoolDto;
		  }
		| null = null;

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
	$: requestedStageId = $page.url.searchParams.get('stage');
	$: activeStageId = getActiveStageId(requestedStageId);
	$: activeStage = sortedStages.find((stage) => stage.id === activeStageId) ?? sortedStages[0];
	$: currentDialog = dialog;
	$: dialogStage =
		currentDialog?.mode === 'create'
			? sortedStages.find((stage) => stage.id === currentDialog.stageId)
			: undefined;

	function getActiveStageId(value: string | null) {
		if (value && sortedStages.some((stage) => stage.id === value)) {
			return value;
		}

		return sortedStages[0]?.id ?? '';
	}

	function getStageTabHref(stageId: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', 'mappools');
		params.set('stage', stageId);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}

	const getBeatmaps = (mappoolId: string) => beatmapsByMappoolId.get(mappoolId) ?? [];

	const getVisibilityError = (mappoolId: string) =>
		form?.action === 'updateMappoolVisibility' && !form.ok && form.mappoolId === mappoolId
			? form
			: undefined;
</script>

<div class="flex flex-col gap-5">
	{#if sortedStages.length === 0}
		<div class="rounded-md border border-border p-6 text-sm text-muted-foreground">
			Add at least one stage before creating mappools.
		</div>
	{:else}
		<TabGroup
			value={activeStageId}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each sortedStages as stage}
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
				{#each sortedStages as stage}
					{@const mappool = mappoolByStageId.get(stage.id)}
					<ContentItem value={stage.id} class="flex flex-col gap-3">
						<div class="flex min-h-10 items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2">
								<p class="truncate font-semibold leading-none">{stage.name}</p>
								{#if mappool}
									<p class="shrink-0 text-xs leading-none text-muted-foreground">
										({mappool.hidden ? 'hidden' : 'visible'})
									</p>
								{/if}
							</div>
							<p class="shrink-0 text-xs leading-none text-muted-foreground">
								{mappool ? getBeatmaps(mappool.id).length : 0}
								{mappool && getBeatmaps(mappool.id).length === 1 ? 'map' : 'maps'}
							</p>
						</div>

						{#if !mappool}
							<div
								class="flex flex-col items-center gap-4 rounded-md border border-border p-8 text-center"
							>
								<p class="text-sm text-muted-foreground">No mappool added yet.</p>
								<Button
									type="button"
									class="gap-1 text-[12px]"
									on:click={() => (dialog = { mode: 'create', stageId: stage.id })}
								>
									<Plus class="h-4 w-4" />
									Create mappool
								</Button>
							</div>
						{:else}
							<div class="flex flex-col gap-3">
								<div class="flex justify-end">
									<div class="flex flex-wrap justify-end gap-2">
										<form method="post" action="?/updateMappoolVisibility" use:enhance>
											<input type="hidden" name="mappoolId" value={mappool.id} />
											<input type="hidden" name="hidden" value={String(!mappool.hidden)} />
											<Button variant="outline" class="text-[12px]" type="submit">
												{mappool.hidden ? 'Show' : 'Hide'}
											</Button>
										</form>

										<Button
											type="button"
											variant="outline"
											class="gap-1 text-[12px]"
											on:click={() => (dialog = { mode: 'addBeatmap', mappool })}
										>
											<Plus class="h-3 w-3" />
											Add map
										</Button>
									</div>
								</div>

								{#if getVisibilityError(mappool.id)}
									<p class="text-sm text-destructive">{getVisibilityError(mappool.id)?.message}</p>
								{/if}

								<MappoolCard
									{mappool}
									beatmaps={getBeatmaps(mappool.id)}
									{tournamentMode}
									result={form}
								/>
							</div>
						{/if}
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>

{#if dialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={(event) => {
			if (event.target === event.currentTarget) dialog = null;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') dialog = null;
		}}
	>
		<div
			class="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-lg font-semibold">
						{dialog.mode === 'create' ? 'Add mappool' : 'Add map'}
					</p>
					<p class="text-sm text-muted-foreground">
						{dialog.mode === 'create'
							? (dialogStage?.name ?? activeStage?.name ?? 'Selected stage')
							: 'Selected mappool'}
					</p>
				</div>
				<Button type="button" variant="ghost" size="icon" on:click={() => (dialog = null)}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			{#if dialog.mode === 'create'}
				{#if dialogStage}
					<CreateMappoolForm
						stage={dialogStage}
						hasMappool={Boolean(mappoolByStageId.get(dialogStage.id))}
						result={form}
						onSuccess={() => (dialog = null)}
						onCancel={() => (dialog = null)}
					/>
				{/if}
			{:else}
				<AddBeatmapForm
					mappool={dialog.mappool}
					beatmaps={getBeatmaps(dialog.mappool.id)}
					{tournamentMode}
					result={form}
					onSuccess={() => (dialog = null)}
					onCancel={() => (dialog = null)}
				/>
			{/if}
		</div>
	</div>
{/if}
