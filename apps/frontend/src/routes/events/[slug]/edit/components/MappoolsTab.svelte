<script lang="ts">
	import { api } from '$lib/api/api';
	import type {
		MappoolAddBeatmapDto,
		MappoolBeatmapDto,
		MappoolCreateDto,
		MappoolDto,
		OsuBeatmapMetadataDto,
		OsuMode,
		StageDto,
		UserSession
	} from '$lib/api/types';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let session: UserSession | undefined;
	export let tournamentMode: OsuMode;
	export let stages: StageDto[];
	export let initialMappools: MappoolDto[];
	export let initialMappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];

	type StageFormState = {
		mappoolStartsAt: string;
		mappoolEndsAt: string;
		mappoolLoading: boolean;
		mappoolError: string | null;
		selectedMappoolId: string;
		beatmapMod: string;
		beatmapId: string;
		beatmapsetId: string;
		beatmapLoading: boolean;
		beatmapError: string | null;
		beatmapManageError: string | null;
		beatmapMetadata: OsuBeatmapMetadataDto | null;
		beatmapMetadataLoading: boolean;
		beatmapMetadataError: string | null;
		requestedBeatmapId: number | null;
	};

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};
	const normalizeMod = (mod: string) => mod.trim().toUpperCase();
	const getBeatmapManageKey = (mappoolId: string, osuBeatmapId: number) => `${mappoolId}:${osuBeatmapId}`;

	let mappools: MappoolDto[] = initialMappools ?? [];
	let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[] = initialMappoolBeatmaps ?? [];
	let stageStateById: Record<string, StageFormState> = {};
	let beatmapManageLoadingByKey: Record<string, boolean> = {};
	let mappoolVisibilityLoadingById: Record<string, boolean> = {};
	let beatmapIndexInputByKey: Record<string, string> = {};
	let beatmapModInputByKey: Record<string, string> = {};
	let beatmapReplaceIdInputByKey: Record<string, string> = {};
	let beatmapReplaceSetInputByKey: Record<string, string> = {};
	let beatmapReplaceRequestedIdByKey: Record<string, number | null> = {};
	let beatmapReplaceMetadataLoadingByKey: Record<string, boolean> = {};
	let beatmapReplaceMetadataErrorByKey: Record<string, string | null> = {};

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: sortedMappools = [...mappools].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: beatmapsByMappoolId = new Map(
		mappoolBeatmaps.map((entry) => [
			entry.mappoolId,
			[...entry.beatmaps]
		])
	);

	const getStageMappools = (stageId: string) => sortedMappools.filter((mappool) => mappool.stageId === stageId);

	const createStageFormState = (stage: StageDto): StageFormState => ({
		mappoolStartsAt: toDateTimeLocalValue(stage.startsAt),
		mappoolEndsAt: toDateTimeLocalValue(stage.endsAt),
		mappoolLoading: false,
		mappoolError: null,
		selectedMappoolId: getStageMappools(stage.id)[0]?.id ?? '',
		beatmapMod: 'NM',
		beatmapId: '',
		beatmapsetId: '',
		beatmapLoading: false,
		beatmapError: null,
		beatmapManageError: null,
		beatmapMetadata: null,
		beatmapMetadataLoading: false,
		beatmapMetadataError: null,
		requestedBeatmapId: null
	});

	const updateStageState = (stageId: string, patch: Partial<StageFormState>) => {
		const current = stageStateById[stageId];
		if (!current) return;
		stageStateById = {
			...stageStateById,
			[stageId]: {
				...current,
				...patch
			}
		};
	};

	const getNextIndexForMod = (mappoolId: string, mod: string) => {
		const normalizedMod = normalizeMod(mod);
		const byMod = (beatmapsByMappoolId.get(mappoolId) ?? []).filter(
			(beatmap) => normalizeMod(beatmap.mod) === normalizedMod
		);
		const maxIndex = byMod.reduce((max, beatmap) => Math.max(max, beatmap.index), 0);
		return maxIndex + 1;
	};

	const getStagePreviewIndex = (stageId: string) => {
		const stageState = stageStateById[stageId];
		if (!stageState) return 1;

		const mod = normalizeMod(stageState.beatmapMod);
		if (!mod || !stageState.selectedMappoolId) return 1;
		return getNextIndexForMod(stageState.selectedMappoolId, mod);
	};

	const getBeatmapIndexInput = (mappoolId: string, osuBeatmapId: number, fallbackIndex: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapIndexInputByKey[key] ?? String(fallbackIndex);
	};

	const getBeatmapModInput = (mappoolId: string, osuBeatmapId: number, fallbackMod: string) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapModInputByKey[key] ?? normalizeMod(fallbackMod);
	};

	const getBeatmapReplaceIdInput = (mappoolId: string, osuBeatmapId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapReplaceIdInputByKey[key] ?? String(osuBeatmapId);
	};

	const getBeatmapReplaceSetInput = (mappoolId: string, osuBeatmapId: number, fallbackBeatmapsetId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapReplaceSetInputByKey[key] ?? String(fallbackBeatmapsetId);
	};

	const getPreviewBeatmap = (stageId: string) => {
		const stageState = stageStateById[stageId];
		if (!stageState) return null;

		const beatmapId = Number.parseInt(stageState.beatmapId, 10);
		if (!Number.isInteger(beatmapId) || beatmapId <= 0) return null;

		const mod = normalizeMod(stageState.beatmapMod);
		if (!mod) return null;

		const metadata = stageState.beatmapMetadata;
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
		updateStageState(stageId, { beatmapMetadataLoading: true, beatmapMetadataError: null });

		try {
			const response = await api({ token: session?.token }).osu().getBeatmap(beatmapId);
			if (!response.success || !response.result) {
				updateStageState(stageId, {
					beatmapMetadata: null,
					beatmapMetadataError: response.error?.message ?? 'Failed to load beatmap metadata'
				});
				return;
			}

			updateStageState(stageId, {
				beatmapMetadata: response.result,
				beatmapsetId: String(response.result.osuBeatmapsetId)
			});
		} finally {
			updateStageState(stageId, { beatmapMetadataLoading: false });
		}
	};

	const loadReplacementBeatmapMetadata = async (key: string, beatmapId: number) => {
		beatmapReplaceMetadataLoadingByKey = { ...beatmapReplaceMetadataLoadingByKey, [key]: true };
		beatmapReplaceMetadataErrorByKey = { ...beatmapReplaceMetadataErrorByKey, [key]: null };

		try {
			const response = await api({ token: session?.token }).osu().getBeatmap(beatmapId);
			if (!response.success || !response.result) {
				beatmapReplaceMetadataErrorByKey = {
					...beatmapReplaceMetadataErrorByKey,
					[key]: response.error?.message ?? 'Failed to load beatmap metadata'
				};
				return;
			}

			beatmapReplaceSetInputByKey = {
				...beatmapReplaceSetInputByKey,
				[key]: String(response.result.osuBeatmapsetId)
			};
		} finally {
			beatmapReplaceMetadataLoadingByKey = { ...beatmapReplaceMetadataLoadingByKey, [key]: false };
		}
	};

	$: {
		for (const stage of sortedStages) {
			if (!stageStateById[stage.id]) {
				stageStateById = {
					...stageStateById,
					[stage.id]: createStageFormState(stage)
				};
			}

			const stageState = stageStateById[stage.id];
			if (!stageState) continue;

			const stageMappools = getStageMappools(stage.id);
			const hasSelectedMappool = stageMappools.some((mappool) => mappool.id === stageState.selectedMappoolId);

			if (stageMappools.length > 0 && !hasSelectedMappool) {
				updateStageState(stage.id, { selectedMappoolId: stageMappools[0].id });
			}
			if (stageMappools.length === 0 && stageState.selectedMappoolId) {
				updateStageState(stage.id, { selectedMappoolId: '' });
			}
		}
	}

	$: {
		for (const stage of sortedStages) {
			const stageState = stageStateById[stage.id];
			if (!stageState) continue;

			const beatmapId = Number.parseInt(stageState.beatmapId, 10);
			if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
				if (stageState.requestedBeatmapId !== null) {
					updateStageState(stage.id, {
						requestedBeatmapId: null,
						beatmapMetadata: null,
						beatmapMetadataError: null
					});
				}
				continue;
			}

			if (stageState.requestedBeatmapId === beatmapId) continue;
			updateStageState(stage.id, { requestedBeatmapId: beatmapId });
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
				if (!(key in beatmapReplaceIdInputByKey)) {
					beatmapReplaceIdInputByKey = {
						...beatmapReplaceIdInputByKey,
						[key]: String(beatmap.osuBeatmapId)
					};
				}
				if (!(key in beatmapReplaceSetInputByKey)) {
					beatmapReplaceSetInputByKey = {
						...beatmapReplaceSetInputByKey,
						[key]: String(beatmap.osuBeatmapsetId)
					};
				}
				if (!(key in beatmapReplaceRequestedIdByKey)) {
					beatmapReplaceRequestedIdByKey = {
						...beatmapReplaceRequestedIdByKey,
						[key]: beatmap.osuBeatmapId
					};
				}
				if (!(key in beatmapReplaceMetadataLoadingByKey)) {
					beatmapReplaceMetadataLoadingByKey = {
						...beatmapReplaceMetadataLoadingByKey,
						[key]: false
					};
				}
				if (!(key in beatmapReplaceMetadataErrorByKey)) {
					beatmapReplaceMetadataErrorByKey = {
						...beatmapReplaceMetadataErrorByKey,
						[key]: null
					};
				}
			}
		}
	}

	$: {
		for (const entry of mappoolBeatmaps) {
			for (const beatmap of entry.beatmaps) {
				const key = getBeatmapManageKey(entry.mappoolId, beatmap.osuBeatmapId);
				const replaceBeatmapId = Number.parseInt(beatmapReplaceIdInputByKey[key] ?? '', 10);

				if (!Number.isInteger(replaceBeatmapId) || replaceBeatmapId <= 0) {
					if (beatmapReplaceRequestedIdByKey[key] !== null) {
						beatmapReplaceRequestedIdByKey = { ...beatmapReplaceRequestedIdByKey, [key]: null };
						beatmapReplaceMetadataErrorByKey = { ...beatmapReplaceMetadataErrorByKey, [key]: null };
					}
					continue;
				}

				if (beatmapReplaceRequestedIdByKey[key] === replaceBeatmapId) continue;
				beatmapReplaceRequestedIdByKey = { ...beatmapReplaceRequestedIdByKey, [key]: replaceBeatmapId };
				void loadReplacementBeatmapMetadata(key, replaceBeatmapId);
			}
		}
	}

	const onMappoolCreate = async (
		stageId: string,
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) => {
		event.preventDefault();
		updateStageState(stageId, { mappoolError: null, mappoolLoading: true });

		try {
			const stageState = stageStateById[stageId];
			if (!stageState) return;

			if (getStageMappools(stageId).length > 0) {
				updateStageState(stageId, { mappoolError: 'Only one mappool is allowed per stage' });
				return;
			}

			const startsAtDate = new Date(stageState.mappoolStartsAt);
			const endsAtDate = new Date(stageState.mappoolEndsAt);
			if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
				updateStageState(stageId, { mappoolError: 'Invalid mappool dates' });
				return;
			}
			if (endsAtDate <= startsAtDate) {
				updateStageState(stageId, { mappoolError: 'Mappool end date must be later than start date' });
				return;
			}

			const body: MappoolCreateDto = {
				stageId,
				startsAt: startsAtDate.toISOString(),
				endsAt: endsAtDate.toISOString()
			};
			const response = await api({ token: session?.token }).mappools().create(body);
			if (!response.success || !response.result) {
				updateStageState(stageId, {
					mappoolError: response.error?.message ?? 'Failed to create mappool'
				});
				return;
			}

			mappools = [...mappools, response.result];
			updateStageState(stageId, { selectedMappoolId: response.result.id });
		} finally {
			updateStageState(stageId, { mappoolLoading: false });
		}
	};

	const onMappoolBeatmapCreate = async (
		stageId: string,
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) => {
		event.preventDefault();
		updateStageState(stageId, { beatmapError: null, beatmapLoading: true });

		try {
			const stageState = stageStateById[stageId];
			if (!stageState) return;

			const mappoolId = stageState.selectedMappoolId;
			const beatmapId = Number.parseInt(stageState.beatmapId, 10);
			const mod = normalizeMod(stageState.beatmapMod);
			const metadata = stageState.beatmapMetadata;

			if (!mappoolId) {
				updateStageState(stageId, { beatmapError: 'Select a mappool first' });
				return;
			}
			if (!mod) {
				updateStageState(stageId, { beatmapError: 'Mod is required' });
				return;
			}
			if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
				updateStageState(stageId, { beatmapError: 'Invalid beatmap id' });
				return;
			}
			if (!metadata || metadata.osuBeatmapId !== beatmapId) {
				updateStageState(stageId, {
					beatmapError: 'Beatmap metadata not loaded yet. Check beatmap id.'
				});
				return;
			}

			const body: MappoolAddBeatmapDto = {
				mod,
				beatmapId,
				beatmapsetId: metadata.osuBeatmapsetId
			};
			const response = await api({ token: session?.token }).mappools().addBeatmap(mappoolId, body);
			if (!response.success || !response.result) {
				updateStageState(stageId, {
					beatmapError: response.error?.message ?? 'Failed to add beatmap'
				});
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

			updateStageState(stageId, {
				beatmapId: '',
				beatmapsetId: ''
			});
		} finally {
			updateStageState(stageId, { beatmapLoading: false });
		}
	};

	const onMappoolBeatmapIndexUpdate = async (stageId: string, mappoolId: string, osuBeatmapId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		updateStageState(stageId, { beatmapManageError: null });
		beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: true };

		try {
			const index = Number.parseInt(beatmapIndexInputByKey[key] ?? '', 10);
			const mod = normalizeMod(beatmapModInputByKey[key] ?? '');
			if (!Number.isInteger(index) || index <= 0) {
				updateStageState(stageId, { beatmapManageError: 'Index must be a positive integer' });
				return;
			}
			if (!mod) {
				updateStageState(stageId, { beatmapManageError: 'Mod must not be empty' });
				return;
			}

			const response = await api({ token: session?.token })
				.mappools()
				.updateBeatmap(mappoolId, osuBeatmapId, { mod, index });
			if (!response.success || !response.result) {
				updateStageState(stageId, {
					beatmapManageError: response.error?.message ?? 'Failed to update beatmap index'
				});
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
		updateStageState(stageId, { beatmapManageError: null });
		beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: true };

		try {
			const response = await api({ token: session?.token }).mappools().deleteBeatmap(mappoolId, osuBeatmapId);
			if (!response.success) {
				updateStageState(stageId, {
					beatmapManageError: response.error?.message ?? 'Failed to delete beatmap'
				});
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

	const onMappoolBeatmapReplace = async (stageId: string, mappoolId: string, osuBeatmapId: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		updateStageState(stageId, { beatmapManageError: null });
		beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: true };

		try {
			const nextOsuBeatmapId = Number.parseInt(beatmapReplaceIdInputByKey[key] ?? '', 10);
			const nextOsuBeatmapsetId = Number.parseInt(beatmapReplaceSetInputByKey[key] ?? '', 10);

			if (!Number.isInteger(nextOsuBeatmapId) || nextOsuBeatmapId <= 0) {
				updateStageState(stageId, { beatmapManageError: 'Invalid replacement beatmap id' });
				return;
			}
			if (!Number.isInteger(nextOsuBeatmapsetId) || nextOsuBeatmapsetId <= 0) {
				updateStageState(stageId, { beatmapManageError: 'Beatmapset id is not loaded yet' });
				return;
			}

			const response = await api({ token: session?.token })
				.mappools()
				.updateBeatmap(mappoolId, osuBeatmapId, {
					beatmapId: nextOsuBeatmapId,
					beatmapsetId: nextOsuBeatmapsetId
				});

			if (!response.success || !response.result) {
				updateStageState(stageId, {
					beatmapManageError: response.error?.message ?? 'Failed to replace beatmap'
				});
				return;
			}

			const updatedBeatmap = response.result as MappoolBeatmapDto;
			mappoolBeatmaps = mappoolBeatmaps.map((entry) =>
				entry.mappoolId === mappoolId
					? {
							...entry,
							beatmaps: entry.beatmaps.map((beatmap) =>
								beatmap.osuBeatmapId === osuBeatmapId ? updatedBeatmap : beatmap
							)
						}
					: entry
			);

			const nextKey = getBeatmapManageKey(mappoolId, updatedBeatmap.osuBeatmapId);
			if (nextKey !== key) {
				beatmapIndexInputByKey = {
					...beatmapIndexInputByKey,
					[nextKey]: String(updatedBeatmap.index)
				};
				delete beatmapIndexInputByKey[key];
				beatmapIndexInputByKey = { ...beatmapIndexInputByKey };

				beatmapModInputByKey = {
					...beatmapModInputByKey,
					[nextKey]: normalizeMod(updatedBeatmap.mod)
				};
				delete beatmapModInputByKey[key];
				beatmapModInputByKey = { ...beatmapModInputByKey };

				beatmapReplaceIdInputByKey = {
					...beatmapReplaceIdInputByKey,
					[nextKey]: String(updatedBeatmap.osuBeatmapId)
				};
				delete beatmapReplaceIdInputByKey[key];
				beatmapReplaceIdInputByKey = { ...beatmapReplaceIdInputByKey };

				beatmapReplaceSetInputByKey = {
					...beatmapReplaceSetInputByKey,
					[nextKey]: String(updatedBeatmap.osuBeatmapsetId)
				};
				delete beatmapReplaceSetInputByKey[key];
				beatmapReplaceSetInputByKey = { ...beatmapReplaceSetInputByKey };

				beatmapReplaceRequestedIdByKey = {
					...beatmapReplaceRequestedIdByKey,
					[nextKey]: updatedBeatmap.osuBeatmapId
				};
				delete beatmapReplaceRequestedIdByKey[key];
				beatmapReplaceRequestedIdByKey = { ...beatmapReplaceRequestedIdByKey };

				beatmapReplaceMetadataErrorByKey = {
					...beatmapReplaceMetadataErrorByKey,
					[nextKey]: null
				};
				delete beatmapReplaceMetadataErrorByKey[key];
				beatmapReplaceMetadataErrorByKey = { ...beatmapReplaceMetadataErrorByKey };

				beatmapReplaceMetadataLoadingByKey = {
					...beatmapReplaceMetadataLoadingByKey,
					[nextKey]: false
				};
				delete beatmapReplaceMetadataLoadingByKey[key];
				beatmapReplaceMetadataLoadingByKey = { ...beatmapReplaceMetadataLoadingByKey };
			}
		} finally {
			beatmapManageLoadingByKey = { ...beatmapManageLoadingByKey, [key]: false };
		}
	};

	const onMappoolVisibilityToggle = async (stageId: string, mappool: MappoolDto) => {
		updateStageState(stageId, { mappoolError: null });
		mappoolVisibilityLoadingById = {
			...mappoolVisibilityLoadingById,
			[mappool.id]: true
		};

		try {
			const response = await api({ token: session?.token })
				.mappools()
				.update(mappool.id, { hidden: !mappool.hidden });
			if (!response.success || !response.result) {
				updateStageState(stageId, {
					mappoolError: response.error?.message ?? 'Failed to update mappool visibility'
				});
				return;
			}

			mappools = mappools.map((candidate) =>
				candidate.id === mappool.id ? (response.result as MappoolDto) : candidate
			);
		} finally {
			mappoolVisibilityLoadingById = {
				...mappoolVisibilityLoadingById,
				[mappool.id]: false
			};
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
				{@const stageState = stageStateById[stage.id]}
				{@const previewBeatmap = getPreviewBeatmap(stage.id)}
				<ContentItem class="flex flex-col gap-6">
					{#if stageState}
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
											<Button
												size="sm"
												variant="outline"
												disabled={mappoolVisibilityLoadingById[mappool.id]}
												on:click={() => onMappoolVisibilityToggle(stage.id, mappool)}
											>
												{mappool.hidden ? 'Show mappool' : 'Hide mappool'}
											</Button>
										</div>
										<div class="mt-2 flex flex-col gap-2">
											{#if mappoolBeatmapsList.length === 0}
												<p class="text-xs text-muted-foreground">No maps in this mappool.</p>
											{:else}
												{#each mappoolBeatmapsList as beatmap}
													{@const beatmapManageKey = getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId)}
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
															<div class="flex w-[140px] flex-col gap-1">
																<Label for={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}>Mod</Label>
																<Input
																	id={`beatmap-mod-${mappool.id}-${beatmap.osuBeatmapId}`}
																	value={getBeatmapModInput(mappool.id, beatmap.osuBeatmapId, beatmap.mod)}
																	on:input={(event) => {
																		const target = event.currentTarget as HTMLInputElement;
																		beatmapModInputByKey = { ...beatmapModInputByKey, [beatmapManageKey]: target.value };
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
																		beatmapIndexInputByKey = { ...beatmapIndexInputByKey, [beatmapManageKey]: target.value };
																	}}
																/>
															</div>
															<div class="flex w-[160px] flex-col gap-1">
																<Label for={`beatmap-replace-id-${mappool.id}-${beatmap.osuBeatmapId}`}>Beatmap id</Label>
																<Input
																	id={`beatmap-replace-id-${mappool.id}-${beatmap.osuBeatmapId}`}
																	type="number"
																	min="1"
																	value={getBeatmapReplaceIdInput(mappool.id, beatmap.osuBeatmapId)}
																	on:input={(event) => {
																		const target = event.currentTarget as HTMLInputElement;
																		beatmapReplaceIdInputByKey = {
																			...beatmapReplaceIdInputByKey,
																			[beatmapManageKey]: target.value
																		};
																	}}
																/>
															</div>
															<div class="flex w-[160px] flex-col gap-1">
																<Label for={`beatmap-replace-set-id-${mappool.id}-${beatmap.osuBeatmapId}`}>Beatmapset id (auto)</Label>
																<Input
																	id={`beatmap-replace-set-id-${mappool.id}-${beatmap.osuBeatmapId}`}
																	type="number"
																	min="1"
																	readonly
																	value={getBeatmapReplaceSetInput(mappool.id, beatmap.osuBeatmapId, beatmap.osuBeatmapsetId)}
																/>
															</div>
															<Button
																size="sm"
																variant="outline"
																disabled={beatmapManageLoadingByKey[beatmapManageKey]}
																on:click={() => onMappoolBeatmapIndexUpdate(stage.id, mappool.id, beatmap.osuBeatmapId)}
															>
																Update index
															</Button>
															<Button
																size="sm"
																variant="outline"
																disabled={
																	beatmapManageLoadingByKey[beatmapManageKey] ||
																	beatmapReplaceMetadataLoadingByKey[beatmapManageKey]
																}
																on:click={() => onMappoolBeatmapReplace(stage.id, mappool.id, beatmap.osuBeatmapId)}
															>
																Replace map
															</Button>
															<Button
																size="sm"
																variant="destructive"
																disabled={beatmapManageLoadingByKey[beatmapManageKey]}
																on:click={() => onMappoolBeatmapDelete(stage.id, mappool.id, beatmap.osuBeatmapId)}
															>
																Delete map
															</Button>
															{#if beatmapReplaceMetadataLoadingByKey[beatmapManageKey]}
																<p class="text-xs text-muted-foreground">Loading replacement metadata...</p>
															{/if}
															{#if beatmapReplaceMetadataErrorByKey[beatmapManageKey]}
																<p class="text-xs text-red-400">{beatmapReplaceMetadataErrorByKey[beatmapManageKey]}</p>
															{/if}
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
										type="datetime-local"
										required
										bind:value={stageStateById[stage.id].mappoolStartsAt}
									/>
								</div>
								<div class="flex w-full max-w-sm flex-col gap-1.5">
									<Label for={`mappool-ends-at-${stage.id}`}>Ends at</Label>
									<Input
										id={`mappool-ends-at-${stage.id}`}
										type="datetime-local"
										required
										bind:value={stageStateById[stage.id].mappoolEndsAt}
									/>
								</div>
							</div>
							{#if stageState.mappoolError}
								<p class="text-sm text-red-400">{stageState.mappoolError}</p>
							{/if}
							<div>
								<Button
									class="w-[160px] bg-accept text-[12px]"
									variant="accept"
									type="submit"
									disabled={stageState.mappoolLoading || stageMappools.length > 0}
								>
									{stageState.mappoolLoading ? 'Creating...' : 'Add mappool'}
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
									bind:value={stageStateById[stage.id].selectedMappoolId}
									disabled={stageMappools.length <= 1}
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
									<Label for={`mappool-mod-${stage.id}`}>
										Mod {#if previewBeatmap}(slot: {previewBeatmap.mod}{previewBeatmap.index}){/if}
									</Label>
									<Input
										id={`mappool-mod-${stage.id}`}
										placeholder="NM, HD, HR..."
										required
										bind:value={stageStateById[stage.id].beatmapMod}
									/>
								</div>
								<div class="flex w-full max-w-sm flex-col gap-1.5">
									<Label for={`beatmap-id-${stage.id}`}>Beatmap id</Label>
									<Input
										id={`beatmap-id-${stage.id}`}
										type="number"
										min="1"
										required
										bind:value={stageStateById[stage.id].beatmapId}
									/>
								</div>
								<div class="flex w-full max-w-sm flex-col gap-1.5">
									<Label for={`beatmapset-id-${stage.id}`}>Beatmapset id (auto)</Label>
									<Input
										id={`beatmapset-id-${stage.id}`}
										type="number"
										min="1"
										readonly
										bind:value={stageStateById[stage.id].beatmapsetId}
									/>
								</div>
							</div>

							{#if stageState.beatmapMetadataLoading}
								<p class="text-xs text-muted-foreground">Loading beatmap metadata...</p>
							{/if}
							{#if stageState.beatmapMetadataError}
								<p class="text-sm text-red-400">{stageState.beatmapMetadataError}</p>
							{/if}
							{#if previewBeatmap}
								<div class="flex w-full max-w-xl flex-col gap-2">
									<p class="text-xs text-muted-foreground">
										Preview of map to add (slot {previewBeatmap.mod}{previewBeatmap.index ?? 1})
									</p>
									<Beatmap
										artist={previewBeatmap.artist}
										title={previewBeatmap.title}
										difficultyName={previewBeatmap.difficultyName}
										beatmapsetId={previewBeatmap.beatmapsetId}
										beatmapId={previewBeatmap.beatmapId}
										mod={previewBeatmap.mod}
										{tournamentMode}
										index={previewBeatmap.index}
										difficulty={previewBeatmap.difficulty}
										deleted={previewBeatmap.deleted}
									/>
								</div>
							{/if}

							{#if stageState.beatmapError}
								<p class="text-sm text-red-400">{stageState.beatmapError}</p>
							{/if}
							{#if stageState.beatmapManageError}
								<p class="text-sm text-red-400">{stageState.beatmapManageError}</p>
							{/if}
							<div>
								<Button
									class="w-[180px] bg-accept text-[12px]"
									variant="accept"
									type="submit"
									disabled={
										stageState.beatmapLoading ||
										stageState.beatmapMetadataLoading ||
										!previewBeatmap ||
										stageMappools.length === 0
									}
								>
									{stageState.beatmapLoading ? 'Adding...' : 'Add map to mappool'}
								</Button>
							</div>
						</form>
					{/if}
				</ContentItem>
			{/each}
		</TabGroup>
	{/if}
</div>
