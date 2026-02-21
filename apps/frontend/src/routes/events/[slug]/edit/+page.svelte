<script lang="ts">
	import { api } from '$lib/api/api';
	import type { OsuMode, StageCreateDto, StageDto, TournamentUpdateDto } from '$lib/api/types';
	import type { PageData } from './$types';
	import Banner from '$lib/components/banner/banner.svelte';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { gamemodes } from '$lib/utils/types';
	import { Calendar, UsersRound } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';

	export let data: PageData;

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

	let stageName = '';
	let stageStartsAt = toDateTimeLocalValue(data.tournament.startsAt);
	let stageEndsAt = toDateTimeLocalValue(data.tournament.endsAt);

	let isLoading = false;
	let errorMessage: string | null = null;
	let isStageLoading = false;
	let stageErrorMessage: string | null = null;

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);

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
</script>

<div class="flex flex-col gap-8">
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
			<TabGroup let:Head let:ContentItem>
				<div class="mb-4">
					<Head let:Item class="gap-2 text-base font-medium">
						<Item buttonClass="rounded-md px-3 py-1.5 transition">Tournament</Item>
						<Item buttonClass="rounded-md px-3 py-1.5 transition">Stages</Item>
					</Head>
				</div>

				<ContentItem>
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
							<a href="/events/{data.tournament.id}">
								<Button type="button" class="w-[120px] text-[12px]" variant="outline"
									>Cancel</Button
								>
							</a>
						</div>
					</form>
				</ContentItem>

				<ContentItem class="flex flex-col gap-6 p-1">
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
				</ContentItem>
			</TabGroup>
		</Content>
	</Group>
</div>
