<script lang="ts">
	import { api } from '$lib/api/api';
	import type { OsuMode, TournamentDto, TournamentUpdateDto, UserSession } from '$lib/api/types';
	import Banner from '$lib/components/banner/banner.svelte';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { gamemodes } from '$lib/utils/types';
	import { Calendar, UsersRound } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let tournament: TournamentDto;
	export let session: UserSession | undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	let name = tournament.name;
	let description = tournament.description ?? '';
	let rules = tournament.rules ?? '';
	let startsAt = toDateTimeLocalValue(tournament.startsAt);
	let endsAt = toDateTimeLocalValue(tournament.endsAt);
	let mode: OsuMode = tournament.mode;
	let isTeam = tournament.isTeam;
	let registrationOpen = tournament.registrationOpen;

	let isLoading = false;
	let errorMessage: string | null = null;

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
				isTeam,
				registrationOpen
			};

			const response = await api({ token: session?.token }).tournaments().update(tournament.id, body);

			if (!response.success) {
				errorMessage = response.error?.message ?? 'Failed to update tournament';
				return;
			}

			window.location.replace(`/events/${tournament.id}`);
		} finally {
			isLoading = false;
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
				<p class="text-[32px] font-semibold">Edit: {tournament.name}</p>
				<BreadcrumbList let:Item>
					<Item
						><div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<Calendar class="h-3 w-3" />
							{new Date(tournament.startsAt).toDateString()}
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
					<Input id="name" name="name" placeholder="Tournament name" required bind:value={name} />
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
				<label class="mt-1 flex w-fit select-none items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={registrationOpen} />
					<span>Registration open</span>
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
</div>
