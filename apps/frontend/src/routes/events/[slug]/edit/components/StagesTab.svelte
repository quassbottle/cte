<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { api } from '$lib/api/api';
	import type { StageCreateDto, StageDto, TournamentDto, UserSession } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let tournament: TournamentDto;
	export let session: UserSession | undefined;
	export let stages: StageDto[];

	const dispatch = createEventDispatcher<{ stageCreated: StageDto }>();

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	let stageName = '';
	let stageStartsAt = toDateTimeLocalValue(tournament.startsAt);
	let stageEndsAt = toDateTimeLocalValue(tournament.endsAt);
	let isStageLoading = false;
	let stageErrorMessage: string | null = null;

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);

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
