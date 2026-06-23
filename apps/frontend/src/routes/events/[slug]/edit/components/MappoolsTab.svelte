<script lang="ts">
	import { enhance } from '$app/forms';
	import type {
		MappoolBeatmapDto,
		MappoolDto,
		OsuBeatmapMetadataDto,
		OsuMode,
		StageDto
	} from '$lib/api/types';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let tournamentMode: OsuMode;
	export let stages: StageDto[];
	export let mappools: MappoolDto[];
	export let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	export let form:
		| {
				action?: string;
				message?: string;
				stageId?: string;
				mappoolId?: string;
		  }
		| undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};
	const normalizeMod = (mod: string) => mod.trim().toUpperCase();
	type BeatmapDraft = {
		beatmapId: string;
		beatmapsetId: string;
		mod: string;
		metadata: OsuBeatmapMetadataDto | null;
		loading: boolean;
		error: string | null;
		requestId: number;
	};

	const createBeatmapDraft = (): BeatmapDraft => ({
		beatmapId: '',
		beatmapsetId: '',
		mod: 'NM',
		metadata: null,
		loading: false,
		error: null,
		requestId: 0
	});

	let beatmapDraftByStageId: Record<string, BeatmapDraft> = {};

	$: {
		for (const stage of sortedStages) {
			if (!beatmapDraftByStageId[stage.id]) {
				beatmapDraftByStageId = {
					...beatmapDraftByStageId,
					[stage.id]: createBeatmapDraft()
				};
			}
		}
	}

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: sortedMappools = [...mappools].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: mappoolsByStageId = new Map(
		sortedStages.map((stage) => [
			stage.id,
			sortedMappools.filter((mappool) => mappool.stageId === stage.id)
		])
	);
	$: beatmapsByMappoolId = new Map(
		mappoolBeatmaps.map((entry) => [entry.mappoolId, [...entry.beatmaps]])
	);

	const getStageMappools = (stageId: string) => mappoolsByStageId.get(stageId) ?? [];
	const getNextIndexForMod = (mappoolId: string, mod: string) => {
		const normalizedMod = normalizeMod(mod);
		const byMod = (beatmapsByMappoolId.get(mappoolId) ?? []).filter(
			(beatmap) => normalizeMod(beatmap.mod) === normalizedMod
		);

		return byMod.reduce((max, beatmap) => Math.max(max, beatmap.index), 0) + 1;
	};
	const actionError = (action: string, mappoolId?: string, stageId?: string) =>
		form?.action === action &&
		(!mappoolId || form.mappoolId === mappoolId) &&
		(!stageId || form.stageId === stageId)
			? form.message
			: undefined;

	const patchBeatmapDraft = (stageId: string, patch: Partial<BeatmapDraft>) => {
		beatmapDraftByStageId = {
			...beatmapDraftByStageId,
			[stageId]: {
				...(beatmapDraftByStageId[stageId] ?? createBeatmapDraft()),
				...patch
			}
		};
	};

	const loadBeatmapMetadata = async (stageId: string, value: string) => {
		const beatmapId = Number.parseInt(value, 10);
		const requestId = (beatmapDraftByStageId[stageId]?.requestId ?? 0) + 1;

		if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
			patchBeatmapDraft(stageId, {
				beatmapId: value,
				beatmapsetId: '',
				metadata: null,
				loading: false,
				error: null,
				requestId
			});
			return;
		}

		patchBeatmapDraft(stageId, {
			beatmapId: value,
			beatmapsetId: '',
			metadata: null,
			loading: true,
			error: null,
			requestId
		});

		try {
			const response = await fetch(`/api/osu/beatmaps/${beatmapId}`);
			if (beatmapDraftByStageId[stageId]?.requestId !== requestId) return;

			if (!response.ok) {
				patchBeatmapDraft(stageId, {
					loading: false,
					error: 'Failed to load beatmap metadata'
				});
				return;
			}

			const metadata = (await response.json()) as OsuBeatmapMetadataDto;
			patchBeatmapDraft(stageId, {
				beatmapsetId: String(metadata.osuBeatmapsetId),
				metadata,
				loading: false,
				error: null
			});
		} catch {
			if (beatmapDraftByStageId[stageId]?.requestId !== requestId) return;
			patchBeatmapDraft(stageId, {
				loading: false,
				error: 'Failed to load beatmap metadata'
			});
		}
	};
</script>

<div class="flex flex-col gap-3">
	{#if sortedStages.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup let:Head let:ContentItem class="flex flex-col gap-4">
			<Head let:Item class="flex flex-wrap gap-2">
				{#each sortedStages as stage}
					<Item
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
				{@const stageMappools = getStageMappools(stage.id)}
				<ContentItem class="flex flex-col gap-6">
					<div class="flex flex-col gap-3">
						<p class="text-sm font-medium">Mappools in {stage.name}</p>
						{#if stageMappools.length === 0}
							<p class="text-sm text-muted-foreground">No mappools for this stage yet.</p>
						{:else}
							{#each stageMappools as mappool}
								{@const mappoolBeatmapsList = beatmapsByMappoolId.get(mappool.id) ?? []}
								<div class="border-border rounded-md border px-3 py-3">
									<div class="flex items-center justify-between gap-2">
										<p class="text-xs text-muted-foreground">
											Visibility: {mappool.hidden ? 'Hidden' : 'Visible'}
										</p>
										<form method="post" action="?/updateMappoolVisibility" use:enhance>
											<input type="hidden" name="mappoolId" value={mappool.id} />
											<input type="hidden" name="hidden" value={String(!mappool.hidden)} />
											<Button size="sm" variant="outline" type="submit">
												{mappool.hidden ? 'Show mappool' : 'Hide mappool'}
											</Button>
										</form>
									</div>
									{#if actionError('updateMappoolVisibility', mappool.id)}
										<p class="mt-2 text-sm text-red-400">
											{actionError('updateMappoolVisibility', mappool.id)}
										</p>
									{/if}

									<div class="mt-2 flex flex-col gap-2">
										{#if mappoolBeatmapsList.length === 0}
											<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
										{:else}
											{#each mappoolBeatmapsList as beatmap}
												<div class="rounded-md border border-border p-2">
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
																<Label for={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}>
																	Mod
																</Label>
																<Input
																	id={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}
																	name="mod"
																	value={normalizeMod(beatmap.mod)}
																/>
															</div>
															<div class="flex w-[140px] flex-col gap-1">
																<Label for={`beatmap-index-${mappool.id}-${beatmap.osuBeatmapId}`}>
																	Index
																</Label>
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
																<Label for={`beatmap-replace-id-${mappool.id}-${beatmap.osuBeatmapId}`}>
																	Beatmap id
																</Label>
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
												</div>
											{/each}
										{/if}
									</div>

									{#if actionError('updateMappoolBeatmap', mappool.id)}
										<p class="mt-2 text-sm text-red-400">
											{actionError('updateMappoolBeatmap', mappool.id)}
										</p>
									{/if}
									{#if actionError('replaceMappoolBeatmap', mappool.id)}
										<p class="mt-2 text-sm text-red-400">
											{actionError('replaceMappoolBeatmap', mappool.id)}
										</p>
									{/if}
									{#if actionError('deleteMappoolBeatmap', mappool.id)}
										<p class="mt-2 text-sm text-red-400">
											{actionError('deleteMappoolBeatmap', mappool.id)}
										</p>
									{/if}
								</div>
							{/each}
						{/if}
					</div>

					<form method="post" action="?/createMappool" class="flex flex-col gap-3" use:enhance>
						<p class="text-sm font-medium">Create mappool</p>
						<input type="hidden" name="stageId" value={stage.id} />
						{#if stageMappools.length > 0}
							<p class="text-xs text-muted-foreground">
								This stage already has a mappool. Only one mappool per stage is allowed.
							</p>
						{/if}
						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-starts-at-${stage.id}`}>Starts at</Label>
								<Input
									id={`mappool-starts-at-${stage.id}`}
									name="startsAt"
									type="datetime-local"
									required
									value={toDateTimeLocalValue(stage.startsAt)}
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-ends-at-${stage.id}`}>Ends at</Label>
								<Input
									id={`mappool-ends-at-${stage.id}`}
									name="endsAt"
									type="datetime-local"
									required
									value={toDateTimeLocalValue(stage.endsAt)}
								/>
							</div>
						</div>
						{#if actionError('createMappool', undefined, stage.id)}
							<p class="text-sm text-red-400">{actionError('createMappool', undefined, stage.id)}</p>
						{/if}
						<div>
							<Button
								class="w-[160px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={stageMappools.length > 0}
							>
								Add mappool
							</Button>
						</div>
					</form>

					{@const beatmapDraft = beatmapDraftByStageId[stage.id] ?? createBeatmapDraft()}
					{@const selectedMappoolId = stageMappools[0]?.id ?? ''}
					{@const selectedMod = normalizeMod(beatmapDraft.mod || 'NM')}
					{@const previewIndex = selectedMappoolId ? getNextIndexForMod(selectedMappoolId, selectedMod) : 1}
					<form method="post" action="?/addMappoolBeatmap" class="flex flex-col gap-3" use:enhance>
						<p class="text-sm font-medium">Add map to mappool</p>
						<div class="flex w-full max-w-sm flex-col gap-1.5">
							<Label for={`stage-mappool-${stage.id}`}>Mappool</Label>
							<select
								id={`stage-mappool-${stage.id}`}
								name="mappoolId"
								class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								disabled={stageMappools.length === 0}
							>
								{#if stageMappools.length === 0}
									<option value="">No mappools available</option>
								{:else}
									{#each stageMappools as mappool, i}
										<option value={mappool.id}>Mappool {i + 1}</option>
									{/each}
								{/if}
							</select>
						</div>

						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-mod-${stage.id}`}>Mod</Label>
								<Input
									id={`mappool-mod-${stage.id}`}
									name="mod"
									placeholder="NM, HD, HR..."
									value={beatmapDraft.mod}
									on:input={(event) =>
										patchBeatmapDraft(stage.id, { mod: event.currentTarget.value })}
									required
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`beatmap-id-${stage.id}`}>Beatmap id</Label>
								<Input
									id={`beatmap-id-${stage.id}`}
									name="beatmapId"
									type="number"
									min="1"
									value={beatmapDraft.beatmapId}
									on:input={(event) => loadBeatmapMetadata(stage.id, event.currentTarget.value)}
									required
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`beatmapset-id-${stage.id}`}>Beatmapset id</Label>
								<Input
									id={`beatmapset-id-${stage.id}`}
									name="beatmapsetId"
									type="number"
									min="1"
									readonly
									value={beatmapDraft.beatmapsetId}
								/>
							</div>
						</div>

						{#if beatmapDraft.loading}
							<p class="text-xs text-muted-foreground">Loading beatmap metadata...</p>
						{/if}
						{#if beatmapDraft.error}
							<p class="text-sm text-red-400">{beatmapDraft.error}</p>
						{/if}
						{#if beatmapDraft.metadata}
							<div class="flex w-full max-w-xl flex-col gap-2">
								<p class="text-xs text-muted-foreground">
									Preview of map to add (slot {selectedMod}{previewIndex})
								</p>
								<Beatmap
									artist={beatmapDraft.metadata.artist}
									title={beatmapDraft.metadata.title}
									difficultyName={beatmapDraft.metadata.difficultyName}
									beatmapsetId={beatmapDraft.metadata.osuBeatmapsetId}
									beatmapId={beatmapDraft.metadata.osuBeatmapId}
									mod={selectedMod}
									{tournamentMode}
									index={previewIndex}
									difficulty={beatmapDraft.metadata.difficulty}
									deleted={beatmapDraft.metadata.deleted}
								/>
							</div>
						{/if}

						{#if form?.action === 'addMappoolBeatmap' && form.message && stageMappools.some((mappool) => mappool.id === form?.mappoolId)}
							<p class="text-sm text-red-400">{form.message}</p>
						{/if}
						<div>
							<Button
								class="w-[180px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={stageMappools.length === 0 || beatmapDraft.loading || !beatmapDraft.metadata}
							>
								Add map to mappool
							</Button>
						</div>
					</form>
				</ContentItem>
			{/each}
		</TabGroup>
	{/if}
</div>
