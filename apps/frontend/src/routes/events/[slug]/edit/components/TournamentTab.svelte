<script lang="ts">
	import { enhance } from '$app/forms';
	import type { TournamentDto } from '$lib/api/types';
	import TournamentBanner from '$lib/components/tournamentBanner/tournamentBanner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { Button } from '$lib/components/ui/button';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import { gamemodes } from '$lib/utils/types';
	import { Calendar, UsersRound } from 'lucide-svelte';

	export let tournament: TournamentDto;
	export let form:
		| {
				action?: string;
				message?: string;
		  }
		| undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};
</script>

<div class="flex flex-col gap-8">
	<div class="relative">
		<TournamentBanner
			class="relative h-[260px] text-white"
			let:Content
			seed={tournament.id}
		>
			<Content class="absolute bottom-0 left-0 flex w-[60%] flex-col p-6">
				<p class="text-[32px] font-semibold">Edit: {tournament.name}</p>
				<BreadcrumbList let:Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<Calendar class="h-3 w-3" />
							{new Date(tournament.startsAt).toDateString()}
						</div>
					</Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<UsersRound class="h-3 w-3" />
							{tournament.isTeam ? 'Team tournament' : 'Solo tournament'}
						</div>
					</Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<GameModeIcon class="h-3 w-3 invert" gamemode={tournament.mode} />
							{gamemodes.find((item) => item.value === tournament.mode)?.label ?? tournament.mode}
						</div>
					</Item>
				</BreadcrumbList>
			</Content>
		</TournamentBanner>
	</div>

	<Group let:Title let:Content>
		<Title>Manage tournament</Title>
		<Content>
			<form
			method="post"
			action="?/updateTournament"
			class="flex flex-col gap-4 p-1"
			use:enhance={() => {
				return async ({ update }) => {
					update({ reset: false });
				};
			}}
		>
				<div class="flex w-full max-w-2xl flex-col gap-1.5">
					<Label for="name">Name</Label>
					<Input id="name" name="name" placeholder="Tournament name" required value={tournament.name} />
				</div>

				<div class="flex w-full max-w-2xl flex-col gap-1.5">
					<Label for="description">Description</Label>
					<textarea
						id="description"
						name="description"
						rows={5}
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[128px] rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
						placeholder="Tournament description"
					>{tournament.description ?? ''}</textarea>
				</div>

				<div class="flex w-full max-w-2xl flex-col gap-1.5">
					<Label for="mode">Mode</Label>
					<select
						id="mode"
						name="mode"
						class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
					>
						{#each gamemodes as gamemode}
							<option value={gamemode.value} selected={gamemode.value === tournament.mode}>
								{gamemode.label}
							</option>
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
					>{tournament.rules ?? ''}</textarea>
				</div>

				<div class="flex flex-col gap-4 md:flex-row">
					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="starts-at">Starts at</Label>
						<Input
							id="starts-at"
							name="startsAt"
							type="datetime-local"
							required
							value={toDateTimeLocalValue(tournament.startsAt)}
						/>
					</div>
					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="ends-at">Ends at</Label>
						<Input
							id="ends-at"
							name="endsAt"
							type="datetime-local"
							required
							value={toDateTimeLocalValue(tournament.endsAt)}
						/>
					</div>
				</div>

				<label class="mt-1 flex w-fit select-none items-center gap-2 text-sm">
					<input name="isTeam" type="checkbox" checked={tournament.isTeam} />
					<span>Team tournament</span>
				</label>
				<label class="mt-1 flex w-fit select-none items-center gap-2 text-sm">
					<input name="registrationOpen" type="checkbox" checked={tournament.registrationOpen} />
					<span>Registration open</span>
				</label>

				{#if form?.action === 'updateTournament' && form.message}
					<p class="text-sm text-red-400">{form.message}</p>
				{/if}

				<div class="mt-2 flex gap-2">
					<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
						Save changes
					</Button>
				</div>
			</form>
		</Content>
	</Group>
</div>
