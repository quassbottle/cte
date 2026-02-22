<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { api } from '$lib/api/api';
	import type { StageCreateDto, StageDto, StageUpdateDto, TournamentDto, UserSession } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let tournament: TournamentDto;
	export let session: UserSession | undefined;
	export let stages: StageDto[];

	type StageFormState = {
		name: string;
		startsAt: string;
		endsAt: string;
		isSaving: boolean;
		isDeleting: boolean;
		error: string | null;
	};

	const dispatch = createEventDispatcher<{
		stageCreated: StageDto;
		stageUpdated: StageDto;
		stageDeleted: string;
	}>();

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	const createStageFormState = (stage: StageDto): StageFormState => ({
		name: stage.name,
		startsAt: toDateTimeLocalValue(stage.startsAt),
		endsAt: toDateTimeLocalValue(stage.endsAt),
		isSaving: false,
		isDeleting: false,
		error: null
	});

	let stageName = '';
	let stageStartsAt = toDateTimeLocalValue(tournament.startsAt);
	let stageEndsAt = toDateTimeLocalValue(tournament.endsAt);
	let isStageLoading = false;
	let stageErrorMessage: string | null = null;
	let stageFormById: Record<string, StageFormState> = {};

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);

	$: {
		const existingIds = new Set(stages.map((stage) => stage.id));
		const nextState: Record<string, StageFormState> = { ...stageFormById };
		let hasChanges = false;

		for (const stage of stages) {
			if (!nextState[stage.id]) {
				nextState[stage.id] = createStageFormState(stage);
				hasChanges = true;
			}
		}

		for (const id of Object.keys(nextState)) {
			if (!existingIds.has(id)) {
				delete nextState[id];
				hasChanges = true;
			}
		}

		if (hasChanges) {
			stageFormById = nextState;
		}
	}

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

			const response = await api({ token: session?.token }).stages().create(tournament.id, body);

			if (!response.success || !response.result) {
				stageErrorMessage = response.error?.message ?? 'Failed to create stage';
				return;
			}

			dispatch('stageCreated', response.result);
			stageName = '';
		} finally {
			isStageLoading = false;
		}
	};

	const onStageUpdate = async (stage: StageDto) => {
		const stageState = stageFormById[stage.id];
		if (!stageState || stageState.isSaving || stageState.isDeleting) {
			return;
		}

		stageState.error = null;
		stageState.isSaving = true;
		stageFormById = { ...stageFormById };

		try {
			const startsAtDate = new Date(stageState.startsAt);
			const endsAtDate = new Date(stageState.endsAt);
			const trimmedName = stageState.name.trim();

			if (trimmedName === '') {
				stageState.error = 'Stage name is required';
				return;
			}
			if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
				stageState.error = 'Invalid stage dates';
				return;
			}
			if (endsAtDate <= startsAtDate) {
				stageState.error = 'Stage end date must be later than start date';
				return;
			}

			const body: StageUpdateDto = {
				name: trimmedName,
				startsAt: startsAtDate.toISOString(),
				endsAt: endsAtDate.toISOString()
			};

			const response = await api({ token: session?.token }).stages().update(tournament.id, stage.id, body);

			if (!response.success || !response.result) {
				stageState.error = response.error?.message ?? 'Failed to update stage';
				return;
			}

			stageFormById = {
				...stageFormById,
				[stage.id]: createStageFormState(response.result)
			};

			dispatch('stageUpdated', response.result);
		} finally {
			stageState.isSaving = false;
			stageFormById = { ...stageFormById };
		}
	};

	const onStageDelete = async (stageId: string) => {
		const stageState = stageFormById[stageId];
		if (!stageState || stageState.isSaving || stageState.isDeleting) {
			return;
		}

		if (!window.confirm('Delete this stage?')) {
			return;
		}

		stageState.error = null;
		stageState.isDeleting = true;
		stageFormById = { ...stageFormById };

		try {
			const response = await api({ token: session?.token }).stages().remove(tournament.id, stageId);

			if (!response.success) {
				stageState.error = response.error?.message ?? 'Failed to delete stage';
				return;
			}

			dispatch('stageDeleted', stageId);
		} finally {
			stageState.isDeleting = false;
			stageFormById = { ...stageFormById };
		}
	};
</script>

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
						<div class="border-border rounded-md border px-3 py-3">
							{#if stageFormById[stage.id]}
								<div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-name-${stage.id}`}>Stage name</Label>
										<Input id={`stage-name-${stage.id}`} bind:value={stageFormById[stage.id].name} />
									</div>
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-starts-at-${stage.id}`}>Starts at</Label>
										<Input
											id={`stage-starts-at-${stage.id}`}
											type="datetime-local"
											bind:value={stageFormById[stage.id].startsAt}
										/>
									</div>
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-ends-at-${stage.id}`}>Ends at</Label>
										<Input
											id={`stage-ends-at-${stage.id}`}
											type="datetime-local"
											bind:value={stageFormById[stage.id].endsAt}
										/>
									</div>
								</div>

								{#if stageFormById[stage.id].error}
									<p class="mt-2 text-sm text-red-400">{stageFormById[stage.id].error}</p>
								{/if}

								<div class="mt-3 flex items-center gap-2">
									<Button
										variant="outline"
										on:click={() => void onStageUpdate(stage)}
										disabled={stageFormById[stage.id].isSaving || stageFormById[stage.id].isDeleting}
									>
										{stageFormById[stage.id].isSaving ? 'Saving...' : 'Save'}
									</Button>
									<Button
										variant="destructive"
										on:click={() => void onStageDelete(stage.id)}
										disabled={stageFormById[stage.id].isSaving || stageFormById[stage.id].isDeleting}
									>
										{stageFormById[stage.id].isDeleting ? 'Deleting...' : 'Delete'}
									</Button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Content>
</Group>
