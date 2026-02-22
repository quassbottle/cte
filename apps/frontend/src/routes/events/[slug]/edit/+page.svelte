<script lang="ts">
	import { api } from '$lib/api/api';
	import type {
		MappoolAddBeatmapDto,
		MappoolBeatmapDto,
		MappoolCreateDto,
		MappoolDto,
		OsuBeatmapMetadataDto,
		OsuMode,
		StageCreateDto,
		StageDto,
		TournamentDto,
		TournamentUpdateDto,
		UserSession
	} from '$lib/api/types';
	import Banner from '$lib/components/banner/banner.svelte';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { gamemodes } from '$lib/utils/types';
	import { Calendar, UsersRound } from 'lucide-svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';

	export let data: {
		tournament: TournamentDto;
		session?: UserSession;
		stages: StageDto[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	};

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	let name = data.tournament.name;
	let description = data.tournament.description ?? '';
	let rules = data.tournament.rules ?? '';
	let startsAt = toDateTimeLocalValue(data.tournament.startsAt);
	let endsAt = toDateTimeLocalValue(data.tournament.endsAt);
	let mode: OsuMode = data.tournament.mode;
	let isTeam = data.tournament.isTeam;
	let stages: StageDto[] = data.stages ?? [];
	let mappools: MappoolDto[] = data.mappools ?? [];
	let mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[] =
		data.mappoolBeatmaps ?? [];

	let stageName = '';
	let stageStartsAt = toDateTimeLocalValue(data.tournament.startsAt);
	let stageEndsAt = toDateTimeLocalValue(data.tournament.endsAt);

	let isLoading = false;
	let errorMessage: string | null = null;
	let isStageLoading = false;
	let stageErrorMessage: string | null = null;

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

	const normalizeMod = (mod: string) => mod.trim().toUpperCase();
	const getStageMappools = (stageId: string) =>
		sortedMappools.filter((mappool) => mappool.stageId === stageId);
	const getStageMappoolId = (stageId: string) => getStageMappools(stageId)[0]?.id ?? '';
	const getBeatmapManageKey = (mappoolId: string, osuBeatmapId: number) => `${mappoolId}:${osuBeatmapId}`;
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
		if (!mod) return 1;
		if (!mappoolId) return 1;
		return getNextIndexForMod(mappoolId, mod);
	};
	const loadBeatmapMetadata = async (stageId: string, beatmapId: number) => {
		beatmapMetadataLoadingByStage = { ...beatmapMetadataLoadingByStage, [stageId]: true };
		beatmapMetadataErrorByStage = { ...beatmapMetadataErrorByStage, [stageId]: null };

		try {
			const response = await api({ token: data.session?.token }).osu().getBeatmap(beatmapId);

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

	const getBeatmapIndexInput = (mappoolId: string, osuBeatmapId: number, fallbackIndex: number) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapIndexInputByKey[key] ?? String(fallbackIndex);
	};
	const getBeatmapModInput = (mappoolId: string, osuBeatmapId: number, fallbackMod: string) => {
		const key = getBeatmapManageKey(mappoolId, osuBeatmapId);
		return beatmapModInputByKey[key] ?? normalizeMod(fallbackMod);
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

			const stageMappools = sortedMappools.filter((mappool) => mappool.stageId === stage.id);
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

	const onTournamentUpdate = async (
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) => {
		event.preventDefault();
		errorMessage = null;
		isLoading = true;

		try {
			const startsAtDate = new Date(startsAt);
			const endsAtDate = new Date(endsAt);

			if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
				errorMessage = 'Invalid tournament dates';
				return;
			}

			const body: TournamentUpdateDto = {
				name: name.trim(),
				description: description.trim() === '' ? null : description.trim(),
				rules: rules.trim() === '' ? null : rules.trim(),
				mode,
				startsAt: startsAtDate.toISOString(),
				endsAt: endsAtDate.toISOString(),
				isTeam
			};

			const response = await api({ token: data.session?.token })
				.tournaments()
				.update(data.tournament.id, body);

			if (!response.success) {
				errorMessage = response.error?.message ?? 'Failed to update tournament';
				return;
			}

			window.location.replace(`/events/${data.tournament.id}`);
		} finally {
			isLoading = false;
		}
	};

	const onStageCreate = async (event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) => {
		event.preventDefault();
		stageErrorMessage = null;
		isStageLoading = true;

		try {
			const startsAtDate = new Date(stageStartsAt);
			const endsAtDate = new Date(stageEndsAt);

			if (stageName.trim() === '') {
				stageErrorMessage = 'Stage name is required';
				return;
			}
			if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
				stageErrorMessage = 'Invalid stage dates';
				return;
			}
			if (endsAtDate <= startsAtDate) {
				stageErrorMessage = 'Stage end date must be later than start date';
				return;
			}

			const body: StageCreateDto = {
				name: stageName.trim(),
				startsAt: startsAtDate.toISOString(),
				endsAt: endsAtDate.toISOString()
			};

			const response = await api({ token: data.session?.token })
				.stages()
				.create(data.tournament.id, body);

			if (!response.success || !response.result) {
				stageErrorMessage = response.error?.message ?? 'Failed to create stage';
				return;
			}

			stages = [...stages, response.result];
			stageName = '';
		} finally {
			isStageLoading = false;
		}
	};

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

			const response = await api({ token: data.session?.token }).mappools().create(body);

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
			const response = await api({ token: data.session?.token }).mappools().addBeatmap(mappoolId, body);

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

	const onMappoolBeatmapIndexUpdate = async (
		stageId: string,
		mappoolId: string,
		osuBeatmapId: number
	) => {
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

			const response = await api({ token: data.session?.token })
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
			const response = await api({ token: data.session?.token }).mappools().deleteBeatmap(mappoolId, osuBeatmapId);
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

<div class="flex flex-col gap-8">
	<TabGroup let:Head let:ContentItem>
		<div class="mb-4 flex items-start justify-between">
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				<Item>Tournament</Item>
				<Item>Stages</Item>
				<Item>Mappools</Item>
			</Head>

			<a href="/events/{data.tournament.id}">
				<Button class="w-[120px] text-[12px]" variant="outline">View</Button>
			</a>
		</div>

		<ContentItem class="flex flex-col gap-8">
			<div class="relative">
				<Banner
					class="relative h-[260px] text-white"
					let:Content
					src={'https://assets.ppy.sh/beatmaps/2315685/covers/cover@2x.jpg'}
				>
					<Content class="absolute bottom-0 left-0 flex w-[60%] flex-col p-6">
						<p class="text-[32px] font-semibold">Edit: {data.tournament.name}</p>
						<BreadcrumbList let:Item>
							<Item
								><div class="flex select-none flex-row items-center gap-1 text-[12px]">
									<Calendar class="h-3 w-3" />
									{new Date(data.tournament.startsAt).toDateString()}
								</div></Item
							>
							<Item
								><div class="flex select-none flex-row items-center gap-1 text-[12px]">
									<UsersRound class="h-3 w-3" />
									{isTeam ? 'Team tournament' : 'Solo tournament'}
								</div></Item
							>
							<Item>
								<div class="flex select-none flex-row items-center gap-1 text-[12px]">
									<GameModeIcon class="h-3 w-3 invert" gamemode={mode} />
									{gamemodes.find((item) => item.value === mode)?.label ?? mode}
								</div>
							</Item>
						</BreadcrumbList>
					</Content>
				</Banner>
			</div>

			<Group let:Title let:Content>
				<Title>Manage tournament</Title>
				<Content>
					<form method="post" class="flex flex-col gap-4 p-1" on:submit={onTournamentUpdate}>
						<div class="flex w-full max-w-2xl flex-col gap-1.5">
							<Label for="name">Name</Label>
							<Input
								id="name"
								name="name"
								placeholder="Tournament name"
								required
								bind:value={name}
							/>
						</div>

						<div class="flex w-full max-w-2xl flex-col gap-1.5">
							<Label for="description">Description</Label>
							<textarea
								id="description"
								name="description"
								rows={5}
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[128px] rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								placeholder="Tournament description"
								bind:value={description}
							></textarea>
						</div>

						<div class="flex w-full max-w-2xl flex-col gap-1.5">
							<Label for="mode">Mode</Label>
							<select
								id="mode"
								class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								bind:value={mode}
							>
								{#each gamemodes as gamemode}
									<option value={gamemode.value}>{gamemode.label}</option>
								{/each}
							</select>
						</div>

						<div class="flex w-full max-w-2xl flex-col gap-1.5">
							<Label for="rules">Rules</Label>
							<textarea
								id="rules"
								name="rules"
								rows={8}
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[180px] rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								placeholder="Tournament rules"
								bind:value={rules}
							></textarea>
						</div>

						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="starts-at">Starts at</Label>
								<Input id="starts-at" type="datetime-local" required bind:value={startsAt} />
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="ends-at">Ends at</Label>
								<Input id="ends-at" type="datetime-local" required bind:value={endsAt} />
							</div>
						</div>

						<label class="mt-1 flex w-fit select-none items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={isTeam} />
							<span>Team tournament</span>
						</label>

						{#if errorMessage}
							<p class="text-sm text-red-400">{errorMessage}</p>
						{/if}

						<div class="mt-2 flex gap-2">
							<Button
								class="w-[140px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={isLoading}>{isLoading ? 'Saving...' : 'Save changes'}</Button
							>
						</div>
					</form>
				</Content>
			</Group>
		</ContentItem>

		<ContentItem>
			<Group let:Title let:Content>
				<Title>Manage stages</Title>
				<Content class="flex flex-col gap-6 p-1">
					<form class="flex flex-col gap-4" on:submit={onStageCreate}>
						<div class="flex w-full max-w-2xl flex-col gap-1.5">
							<Label for="stage-name">Stage name</Label>
							<Input
								id="stage-name"
								name="stage-name"
								placeholder="Group Stage, Finals, etc."
								required
								bind:value={stageName}
							/>
						</div>

						<div class="flex flex-col gap-4 md:flex-row">
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="stage-starts-at">Starts at</Label>
								<Input id="stage-starts-at" type="datetime-local" required bind:value={stageStartsAt} />
							</div>
							<div class="flex w-full max-w-sm flex-col gap-1.5">
								<Label for="stage-ends-at">Ends at</Label>
								<Input id="stage-ends-at" type="datetime-local" required bind:value={stageEndsAt} />
							</div>
						</div>

						{#if stageErrorMessage}
							<p class="text-sm text-red-400">{stageErrorMessage}</p>
						{/if}

						<div>
							<Button
								class="w-[140px] bg-accept text-[12px]"
								variant="accept"
								type="submit"
								disabled={isStageLoading}>{isStageLoading ? 'Creating...' : 'Add stage'}</Button
							>
						</div>
					</form>

					<div class="flex flex-col gap-2">
						<p class="text-sm font-medium">Current stages</p>
						{#if sortedStages.length === 0}
							<p class="text-sm text-muted-foreground">No stages added yet.</p>
						{:else}
							<div class="flex flex-col gap-2">
								{#each sortedStages as stage (stage.id)}
									<div class="border-border rounded-md border px-3 py-2">
										<p class="text-sm font-medium">{stage.name}</p>
										<p class="text-xs text-muted-foreground">
											{new Date(stage.startsAt).toLocaleString()} - {new Date(stage.endsAt).toLocaleString()}
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</Content>
			</Group>
		</ContentItem>

		<ContentItem class="flex flex-col gap-3">
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
									{#if sortedMappools.filter((mappool) => mappool.stageId === stage.id).length === 0}
										<p class="text-sm text-muted-foreground">No mappools for this stage yet.</p>
									{:else}
										{#each sortedMappools.filter((mappool) => mappool.stageId === stage.id) as mappool}
											<div class="border-border rounded-md border px-3 py-3">
												<p class="text-sm font-medium">
													{new Date(mappool.startsAt).toLocaleString()} - {new Date(mappool.endsAt).toLocaleString()}
												</p>
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
																				beatmapModInputByKey = {
																					...beatmapModInputByKey,
																					[key]: target.value
																				};
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
																				beatmapIndexInputByKey = {
																					...beatmapIndexInputByKey,
																					[key]: target.value
																				};
																			}}
																		/>
																	</div>
																	<Button
																		size="sm"
																		variant="outline"
																		disabled={beatmapManageLoadingByKey[getBeatmapManageKey(mappool.id, beatmap.osuBeatmapId)]}
																		on:click={() =>
																			onMappoolBeatmapIndexUpdate(stage.id, mappool.id, beatmap.osuBeatmapId)}
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
											disabled={
												mappoolLoadingByStage[stage.id] || getStageMappools(stage.id).length > 0
											}
										>
											{mappoolLoadingByStage[stage.id] ? 'Creating...' : 'Add mappool'}
										</Button>
									</div>
								</form>

								<form
									class="flex flex-col gap-3"
									on:submit={(event) => onMappoolBeatmapCreate(stage.id, event)}
								>
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
												{#each getStageMappools(stage.id) as mappool}
													<option value={mappool.id}>
														{new Date(mappool.startsAt).toLocaleString()} - {new Date(mappool.endsAt).toLocaleString()}
													</option>
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
		</ContentItem>
	</TabGroup>
</div>
