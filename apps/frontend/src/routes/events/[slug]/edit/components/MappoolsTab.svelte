<script lang="ts">
	import { api } from '$lib/api/api';
	import type {
		MappoolAddBeatmapDto,
		MappoolBeatmapDto,
		MappoolCreateDto,
		MappoolDto,
		OsuBeatmapMetadataDto,
		StageDto,
		UserSession
	} from '$lib/api/types';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let session: UserSession | undefined;
	export let stages: StageDto[];
	export let initialMappools: MappoolDto[];
	export let initialMappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};
	const normalizeMod = (mod: string) => mod.trim().toUpperCase();
	const getBeatmapManageKey = (mappoolId: string, osuBeatmapId: number) => `${mappoolId}:${osuBeatmapId}`;

	let mappools: MappoolDto[] = initialMappools ?? [];
	let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[] = initialMappoolBeatmaps ?? [];
	let mappoolStartsAtByStage: Record<string, string> = {};
	let mappoolEndsAtByStage: Record<string, string> = {};
	let mappoolLoadingByStage: Record<string, boolean> = {};
	let mappoolErrorByStage: Record<string, string | null> = {};
	let selectedMappoolIdByStage: Record<string, string> = {};
	let beatmapModByStage: Record<string, string> = {};
	let beatmapIdByStage: Record<string, string> = {};
	let beatmapsetIdByStage: Record<string, string> = {};
	let beatmapLoadingByStage: Record<string, boolean> = {};
	let beatmapErrorByStage: Record<string, string | null> = {};
	let beatmapManageErrorByStage: Record<string, string | null> = {};
	let beatmapManageLoadingByKey: Record<string, boolean> = {};
	let beatmapIndexInputByKey: Record<string, string> = {};
	let beatmapModInputByKey: Record<string, string> = {};
	let beatmapMetadataByStage: Record<string, OsuBeatmapMetadataDto | null> = {};
	let beatmapMetadataLoadingByStage: Record<string, boolean> = {};
	let beatmapMetadataErrorByStage: Record<string, string | null> = {};
	let requestedBeatmapIdByStage: Record<string, number | null> = {};

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: sortedMappools = [...mappools].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: beatmapsByMappoolId = new Map(
		mappoolBeatmaps.map((entry) => [
			entry.mappoolId,
			[...entry.beatmaps].sort((left, right) =>
				left.mod === right.mod ? left.index - right.index : left.mod.localeCompare(right.mod)
			)
		])
	);

	const getStageMappools = (stageId: string) => sortedMappools.filter((mappool) => mappool.stageId === stageId);
	const getStageMappoolId = (stageId: string) => getStageMappools(stageId)[0]?.id ?? '';
	const getNextIndexForMod = (mappoolId: string, mod: string) => {
		const normalizedMod = normalizeMod(mod);
		const byMod = (beatmapsByMappoolId.get(mappoolId) ?? []).filter(
			(beatmap) => normalizeMod(beatmap.mod) === normalizedMod
		);
		const maxIndex = byMod.reduce((max, beatmap) => Math.max(max, beatmap.index), 0);
		return maxIndex + 1;
	};
	const getStagePreviewIndex = (stageId: string) => {
		const mappoolId = selectedMappoolIdByStage[stageId];
		const mod = normalizeMod(beatmapModByStage[stageId] ?? '');
		if (!mod || !mappoolId) return 1;
		return getNextIndexForMod(mappoolId, mod);
	};
	const getBeatmapIndexInput = (mappoolId: string, osuBeatmapId: number, fallbackIndex: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapIndexInputByKey[key] ?? String(fallbackIndex);
	};
	const getBeatmapModInput = (mappoolId: string, osuBeatmapId: number, fallbackMod: string) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapModInputByKey[key] ?? normalizeMod(fallbackMod);
	};
	const getPreviewBeatmap = (stageId: string) => {
		const beatmapId = Number.parseInt(beatmapIdByStage[stageId] ?? '', 10);
		if (!Number.isInteger(beatmapId) || beatmapId <= 0) return null;
		const mod = normalizeMod(beatmapModByStage[stageId] ?? '');
		if (!mod) return null;
		const metadata = beatmapMetadataByStage[stageId];
		if (!metadata || metadata.osuBeatmapId !== beatmapId) return null;
		return {
			artist: metadata.artist,
			title: metadata.title,
			difficultyName: metadata.difficultyName,
			beatmapsetId: metadata.osuBeatmapsetId,
			beatmapId,
			mod,
			index: getStagePreviewIndex(stageId),
			difficulty: metadata.difficulty ?? null,
			deleted: metadata.deleted ?? false
		};
	};

	const loadBeatmapMetadata = async (stageId: string, beatmapId: number) => {
		beatmapMetadataLoadingByStage = { ...beatmapMetadataLoadingByStage, [stageId]: true };
		beatmapMetadataErrorByStage = { ...beatmapMetadataErrorByStage, [stageId]: null };

		try {
			const response = await api({ token: session?.token }).osu().getBeatmap(beatmapId);
			if (!response.success || !response.result) {
				beatmapMetadataByStage = { ...beatmapMetadataByStage, [stageId]: null };
				beatmapMetadataErrorByStage = {
					...beatmapMetadataErrorByStage,
					[stageId]: response.error?.message ?? 'Failed to load beatmap metadata'
				};
				return;
			}

			beatmapMetadataByStage = { ...beatmapMetadataByStage, [stageId]: response.result };
			beatmapsetIdByStage = {
				...beatmapsetIdByStage,
				[stageId]: String(response.result.osuBeatmapsetId)
			};
		} finally {
			beatmapMetadataLoadingByStage = { ...beatmapMetadataLoadingByStage, [stageId]: false };
		}
	};

	$: {
		for (const stage of sortedStages) {
			if (!mappoolStartsAtByStage[stage.id]) {
				mappoolStartsAtByStage = {
					...mappoolStartsAtByStage,
					[stage.id]: toDateTimeLocalValue(stage.startsAt)
				};
			}
			if (!mappoolEndsAtByStage[stage.id]) {
				mappoolEndsAtByStage = {
					...mappoolEndsAtByStage,
					[stage.id]: toDateTimeLocalValue(stage.endsAt)
				};
			}
			if (!beatmapModByStage[stage.id]) {
				beatmapModByStage = {
					...beatmapModByStage,
					[stage.id]: 'NM'
				};
			}
			if (!(stage.id in requestedBeatmapIdByStage)) {
				requestedBeatmapIdByStage = {
					...requestedBeatmapIdByStage,
					[stage.id]: null
				};
			}

			const stageMappools = getStageMappools(stage.id);
			const selectedMappoolId = selectedMappoolIdByStage[stage.id];
			const hasSelectedMappool = stageMappools.some((mappool) => mappool.id === selectedMappoolId);

			if (stageMappools.length > 0 && !hasSelectedMappool) {
				selectedMappoolIdByStage = {
					...selectedMappoolIdByStage,
					[stage.id]: getStageMappoolId(stage.id)
				};
			}
			if (stageMappools.length === 0 && selectedMappoolId) {
				selectedMappoolIdByStage = {
					...selectedMappoolIdByStage,
					[stage.id]: ''
				};
			}
		}
	}

	$: {
		for (const stage of sortedStages) {
			const beatmapId = Number.parseInt(beatmapIdByStage[stage.id] ?? '', 10);
			if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
				if (requestedBeatmapIdByStage[stage.id] !== null) {
					requestedBeatmapIdByStage = { ...requestedBeatmapIdByStage, [stage.id]: null };
					beatmapMetadataByStage = { ...beatmapMetadataByStage, [stage.id]: null };
					beatmapMetadataErrorByStage = { ...beatmapMetadataErrorByStage, [stage.id]: null };
				}
				continue;
			}

			if (requestedBeatmapIdByStage[stage.id] === beatmapId) continue;
			requestedBeatmapIdByStage = { ...requestedBeatmapIdByStage, [stage.id]: beatmapId };
			void loadBeatmapMetadata(stage.id, beatmapId);
		}
	}

	$: {
		for (const entry of mappoolBeatmaps) {
			for (const beatmap of entry.beatmaps) {
				const key = getBeatmapManageKey(entry.mappoolId, beatmap.osuBeatmapId);
				if (!(key in beatmapIndexInputByKey)) {
					beatmapIndexInputByKey = {
						...beatmapIndexInputByKey,
						[key]: String(beatmap.index)
					};
				}
				if (!(key in beatmapModInputByKey)) {
					beatmapModInputByKey = {
						...beatmapModInputByKey,
						[key]: normalizeMod(beatmap.mod)
					};
				}
			}
		}
	}

	const onMappoolCreate = async (
		stageId: string,
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) => {
		event.preventDefault();
		mappoolErrorByStage = { ...mappoolErrorByStage, [stageId]: null };
		mappoolLoadingByStage = { ...mappoolLoadingByStage, [stageId]: true };

		try {
			if (getStageMappools(stageId).length > 0) {
				mappoolErrorByStage = {
					...mappoolErrorByStage,
					[stageId]: 'Only one mappool is allowed per stage'
				};
				return;
			}

			const startsAtDate = new Date(mappoolStartsAtByStage[stageId]);
			const endsAtDate = new Date(mappoolEndsAtByStage[stageId]);
			if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
				mappoolErrorByStage = { ...mappoolErrorByStage, [stageId]: 'Invalid mappool dates' };
				return;
			}
			if (endsAtDate <= startsAtDate) {
				mappoolErrorByStage = {
					...mappoolErrorByStage,
					[stageId]: 'Mappool end date must be later than start date'
				};
				return;
			}

			const body: MappoolCreateDto = {
				stageId,
				startsAt: startsAtDate.toISOString(),
				endsAt: endsAtDate.toISOString()
			};
			const response = await api({ token: session?.token }).mappools().create(body);
			if (!response.success || !response.result) {
				mappoolErrorByStage = {
					...mappoolErrorByStage,
					[stageId]: response.error?.message ?? 'Failed to create mappool'
				};
				return;
			}

			mappools = [...mappools, response.result];
			selectedMappoolIdByStage = {
				...selectedMappoolIdByStage,
				[stageId]: response.result.id
			};
		} finally {
			mappoolLoadingByStage = { ...mappoolLoadingByStage, [stageId]: false };
		}
	};

	const onMappoolBeatmapCreate = async (
		stageId: string,
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) => {
		event.preventDefault();
		beatmapErrorByStage = { ...beatmapErrorByStage, [stageId]: null };
		beatmapLoadingByStage = { ...beatmapLoadingByStage, [stageId]: true };

		try {
			const mappoolId = selectedMappoolIdByStage[stageId];
			const beatmapId = Number.parseInt(beatmapIdByStage[stageId] ?? '', 10);
			const mod = normalizeMod(beatmapModByStage[stageId] ?? '');
			const metadata = beatmapMetadataByStage[stageId];

			if (!mappoolId) {
				beatmapErrorByStage = { ...beatmapErrorByStage, [stageId]: 'Select a mappool first' };
				return;
			}
			if (!mod) {
				beatmapErrorByStage = { ...beatmapErrorByStage, [stageId]: 'Mod is required' };
				return;
			}
			if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
				beatmapErrorByStage = { ...beatmapErrorByStage, [stageId]: 'Invalid beatmap id' };
				return;
			}
			if (!metadata || metadata.osuBeatmapId !== beatmapId) {
				beatmapErrorByStage = {
					...beatmapErrorByStage,
					[stageId]: 'Beatmap metadata not loaded yet. Check beatmap id.'
				};
				return;
			}

			const body: MappoolAddBeatmapDto = {
				mod,
				beatmapId,
				beatmapsetId: metadata.osuBeatmapsetId
			};
			const response = await api({ token: session?.token }).mappools().addBeatmap(mappoolId, body);
			if (!response.success || !response.result) {
				beatmapErrorByStage = {
					...beatmapErrorByStage,
					[stageId]: response.error?.message ?? 'Failed to add beatmap'
				};
				return;
			}

			const existingEntry = mappoolBeatmaps.find((entry) => entry.mappoolId === mappoolId);
			if (existingEntry) {
				mappoolBeatmaps = mappoolBeatmaps.map((entry) =>
					entry.mappoolId === mappoolId
						? { ...entry, beatmaps: [...entry.beatmaps, response.result as MappoolBeatmapDto] }
						: entry
				);
			} else {
				mappoolBeatmaps = [
					...mappoolBeatmaps,
					{ mappoolId, beatmaps: [response.result as MappoolBeatmapDto] }
				];
			}

			beatmapIdByStage = { ...beatmapIdByStage, [stageId]: '' };
			beatmapsetIdByStage = { ...beatmapsetIdByStage, [stageId]: '' };
		} finally {
			beatmapLoadingByStage = { ...beatmapLoadingByStage, [stageId]: false };
		}
	};

	const onMappoolBeatmapIndexUpdate = async (stageId: string, mappoolId: string, osuBeatmapId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		beatmapManageErrorByStage = { ...beatmapManageErrorByStage, [stageId]: null };
		beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: true };

		try {
			const index = Number.parseInt(beatmapIndexInputByKey[key] ?? '', 10);
			const mod = normalizeMod(beatmapModInputByKey[key] ?? '');
			if (!Number.isInteger(index) || index <= 0) {
				beatmapManageErrorByStage = {
					...beatmapManageErrorByStage,
					[stageId]: 'Index must be a positive integer'
				};
				return;
			}
			if (!mod) {
				beatmapManageErrorByStage = {
					...beatmapManageErrorByStage,
					[stageId]: 'Mod must not be empty'
				};
				return;
			}

			const response = await api({ token: session?.token })
				.mappools()
				.updateBeatmap(mappoolId, osuBeatmapId, { mod, index });
			if (!response.success || !response.result) {
				beatmapManageErrorByStage = {
					...beatmapManageErrorByStage,
					[stageId]: response.error?.message ?? 'Failed to update beatmap index'
				};
				return;
			}

			mappoolBeatmaps = mappoolBeatmaps.map((entry) =>
				entry.mappoolId === mappoolId
					? {
							...entry,
							beatmaps: entry.beatmaps.map((beatmap) =>
								beatmap.osuBeatmapId === osuBeatmapId
									? (response.result as MappoolBeatmapDto)
									: beatmap
							)
						}
					: entry
			);
			beatmapIndexInputByKey = { ...beatmapIndexInputByKey, [key]: String(index) };
			beatmapModInputByKey = { ...beatmapModInputByKey, [key]: mod };
		} finally {
			beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: false };
		}
	};

	const onMappoolBeatmapDelete = async (stageId: string, mappoolId: string, osuBeatmapId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		beatmapManageErrorByStage = { ...beatmapManageErrorByStage, [stageId]: null };
		beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: true };

		try {
			const response = await api({ token: session?.token }).mappools().deleteBeatmap(mappoolId, osuBeatmapId);
			if (!response.success) {
				beatmapManageErrorByStage = {
					...beatmapManageErrorByStage,
					[stageId]: response.error?.message ?? 'Failed to delete beatmap'
				};
				return;
			}

			mappoolBeatmaps = mappoolBeatmaps.map((entry) =>
				entry.mappoolId === mappoolId
					? {
							...entry,
							beatmaps: entry.beatmaps.filter((beatmap) => beatmap.osuBeatmapId !== osuBeatmapId)
						}
					: entry
			);
		} finally {
			beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: false };
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
				<ContentItem class="flex flex-col gap-6">
					<div class="flex flex-col gap-3">
						<p class="text-sm font-medium">Mappools in {stage.name}</p>
						{#if getStageMappools(stage.id).length === 0}
							<p class="text-sm text-muted-foreground">No mappools for this stage yet.</p>
						{:else}
							{#each getStageMappools(stage.id) as mappool}
								<div class="border-border rounded-md border px-3 py-3">
									<div class="mt-2 flex flex-col gap-2">
										{#if (beatmapsByMappoolId.get(mappool.id) ?? []).length === 0}
											<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
										{:else}
											{#each beatmapsByMappoolId.get(mappool.id) ?? [] as beatmap}
												<div class="rounded-md border border-border p-2">
													<Beatmap
														difficultyName={beatmap.difficultyName}
														artist={beatmap.artist}
														title={beatmap.title}
														beatmapsetId={beatmap.osuBeatmapsetId}
														beatmapId={beatmap.osuBeatmapId}
														mod={normalizeMod(beatmap.mod)}
														index={beatmap.index}
														difficulty={beatmap.difficulty}
														deleted={beatmap.deleted}
													/>
													<div class="mt-2 flex flex-wrap items-end gap-2 px-2 pb-2">
														<div class="flex w-[140px] flex-col gap-1">
															<Label for={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}>Mod</Label>
															<Input
																id={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}
																value={getBeatmapModInput(mappool.id, beatmap.osuBeatmapId, beatmap.mod)}
																on:input={(event) => {
																	const target = event.currentTarget as HTMLInputElement;
																	const key = getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId);
																	beatmapModInputByKey = { ...beatmapModInputByKey, [key]: target.value };
																}}
															/>
														</div>
														<div class="flex w-[140px] flex-col gap-1">
															<Label for={`beatmap-index-${mappool.id}-${beatmap.osuBeatmapId}`}>Index</Label>
															<Input
																id={`beatmap-index-${mappool.id}-${beatmap.osuBeatmapId}`}
																type="number"
																min="1"
																value={getBeatmapIndexInput(mappool.id, beatmap.osuBeatmapId, beatmap.index)}
																on:input={(event) => {
																	const target = event.currentTarget as HTMLInputElement;
																	const key = getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId);
																	beatmapIndexInputByKey = { ...beatmapIndexInputByKey, [key]: target.value };
																}}
															/>
														</div>
														<Button
															size="sm"
															variant="outline"
															disabled={beatmapManageLoadingByKey[getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId)]}
															on:click={() => onMappoolBeatmapIndexUpdate(stage.id, mappool.id, beatmap.osuBeatmapId)}
														>
															Update index
														</Button>
														<Button
															size="sm"
															variant="destructive"
															disabled={beatmapManageLoadingByKey[getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId)]}
															on:click={() => onMappoolBeatmapDelete(stage.id, mappool.id, beatmap.osuBeatmapId)}
														>
															Delete map
														</Button>
													</div>
												</div>
											{/each}
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>

					<form class="flex flex-col gap-3" on:submit={(event) => onMappoolCreate(stage.id, event)}>
						<p class="text-sm font-medium">Create mappool</p>
						{#if getStageMappools(stage.id).length > 0}
							<p class="text-xs text-muted-foreground">
								This stage already has a mappool. Only one mappool per stage is allowed.
							</p>
						{/if}
						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-starts-at-${stage.id}`}>Starts at</Label>
								<Input
									id={`mappool-starts-at-${stage.id}`}
									type="datetime-local"
									required
									bind:value={mappoolStartsAtByStage[stage.id]}
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-ends-at-${stage.id}`}>Ends at</Label>
								<Input
									id={`mappool-ends-at-${stage.id}`}
									type="datetime-local"
									required
									bind:value={mappoolEndsAtByStage[stage.id]}
								/>
							</div>
						</div>
						{#if mappoolErrorByStage[stage.id]}
							<p class="text-sm text-red-400">{mappoolErrorByStage[stage.id]}</p>
						{/if}
						<div>
							<Button
								class="w-[160px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={mappoolLoadingByStage[stage.id] || getStageMappools(stage.id).length > 0}
							>
								{mappoolLoadingByStage[stage.id] ? 'Creating...' : 'Add mappool'}
							</Button>
						</div>
					</form>

					<form class="flex flex-col gap-3" on:submit={(event) => onMappoolBeatmapCreate(stage.id, event)}>
						<p class="text-sm font-medium">Add map to mappool</p>
						<div class="flex w-full max-w-sm flex-col gap-1.5">
							<Label for={`stage-mappool-${stage.id}`}>Mappool</Label>
							<select
								id={`stage-mappool-${stage.id}`}
								class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								bind:value={selectedMappoolIdByStage[stage.id]}
								disabled={getStageMappools(stage.id).length <= 1}
							>
								{#if getStageMappools(stage.id).length === 0}
									<option value="">No mappools available</option>
								{:else}
									{#each getStageMappools(stage.id) as mappool, i}
										<option value={mappool.id}>Mappool {i + 1}</option>
									{/each}
								{/if}
							</select>
						</div>

						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`mappool-mod-${stage.id}`}>
									Mod {#if getPreviewBeatmap(stage.id)}(slot: {getPreviewBeatmap(stage.id)?.mod}{getPreviewBeatmap(stage.id)?.index}){/if}
								</Label>
								<Input
									id={`mappool-mod-${stage.id}`}
									placeholder="NM, HD, HR..."
									required
									bind:value={beatmapModByStage[stage.id]}
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`beatmap-id-${stage.id}`}>Beatmap id</Label>
								<Input
									id={`beatmap-id-${stage.id}`}
									type="number"
									min="1"
									required
									bind:value={beatmapIdByStage[stage.id]}
								/>
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for={`beatmapset-id-${stage.id}`}>Beatmapset id (auto)</Label>
								<Input
									id={`beatmapset-id-${stage.id}`}
									type="number"
									min="1"
									readonly
									bind:value={beatmapsetIdByStage[stage.id]}
								/>
							</div>
						</div>

						{#if beatmapMetadataLoadingByStage[stage.id]}
							<p class="text-xs text-muted-foreground">Loading beatmap metadata...</p>
						{/if}
						{#if beatmapMetadataErrorByStage[stage.id]}
							<p class="text-sm text-red-400">{beatmapMetadataErrorByStage[stage.id]}</p>
						{/if}
						{#if getPreviewBeatmap(stage.id)}
							<div class="flex w-full max-w-xl flex-col gap-2">
								<p class="text-xs text-muted-foreground">
									Preview of map to add (slot {getPreviewBeatmap(stage.id)?.mod}{getPreviewBeatmap(stage.id)?.index ?? 1})
								</p>
								<Beatmap
									artist={getPreviewBeatmap(stage.id)?.artist ?? ''}
									title={getPreviewBeatmap(stage.id)?.title ?? ''}
									difficultyName={getPreviewBeatmap(stage.id)?.difficultyName ?? ''}
									beatmapsetId={getPreviewBeatmap(stage.id)?.beatmapsetId ?? 1}
									beatmapId={getPreviewBeatmap(stage.id)?.beatmapId ?? 1}
									mod={getPreviewBeatmap(stage.id)?.mod ?? 'NM'}
									index={getPreviewBeatmap(stage.id)?.index ?? 1}
									difficulty={getPreviewBeatmap(stage.id)?.difficulty ?? null}
									deleted={getPreviewBeatmap(stage.id)?.deleted ?? false}
								/>
							</div>
						{/if}

						{#if beatmapErrorByStage[stage.id]}
							<p class="text-sm text-red-400">{beatmapErrorByStage[stage.id]}</p>
						{/if}
						{#if beatmapManageErrorByStage[stage.id]}
							<p class="text-sm text-red-400">{beatmapManageErrorByStage[stage.id]}</p>
						{/if}
						<div>
							<Button
								class="w-[180px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={
									beatmapLoadingByStage[stage.id] ||
									beatmapMetadataLoadingByStage[stage.id] ||
									!getPreviewBeatmap(stage.id) ||
									getStageMappools(stage.id).length === 0
								}
							>
								{beatmapLoadingByStage[stage.id] ? 'Adding...' : 'Add map to mappool'}
							</Button>
						</div>
					</form>
				</ContentItem>
			{/each}
		</TabGroup>
	{/if}
</div>

