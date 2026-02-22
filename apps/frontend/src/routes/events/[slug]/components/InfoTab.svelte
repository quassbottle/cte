<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, UserDto, UserSession } from '$lib/api/types';
	import { gamemodes } from '$lib/utils/types';
	import { pluralize } from '$lib/utils/text';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import Banner from '$lib/components/banner/banner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { Calendar, UserRound } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Markdown from '$lib/components/markdown/markdown.svelte';

	export let tournament: TournamentDto;
	export let session: UserSession | undefined;
	export let participants: TournamentParticipantDto[];
	export let host: UserDto;
	export let form:
		| {
				registrationError?: string;
				teamName?: string;
				teamParticipantIds?: string;
		  }
		| undefined;

	$: isLoggedIn = Boolean(session?.id);
	$: isRegistered = Boolean(session?.id && participants.some((participant) => participant.id === session?.id));
	$: canShowRegistrationForm = tournament.registrationOpen || isRegistered;
	$: registerButtonText = isRegistered
		? tournament.isTeam
			? 'Unregister team'
			: 'Unregister'
		: tournament.isTeam
			? 'Register team'
			: 'Register';
	$: registerAction = isRegistered ? 'unregister' : 'register';
</script>

<div class="flex flex-col gap-8">
	<div class="relative">
		<Banner
			class="relative h-[260px] text-white"
			let:Content
			src={'https://assets.ppy.sh/beatmaps/2315685/covers/cover@2x.jpg'}
		>
			<Content class="absolute bottom-0 left-0 flex w-[60%] flex-col p-6">
				<p class="text-[32px] font-semibold">{tournament.name}</p>
				<BreadcrumbList let:Item>
					<Item
						><div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<Calendar class="h-3 w-3" />
							{new Date(tournament.startsAt).toDateString()}
						</div></Item
					>
					<Item
						><div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<UserRound class="h-3 w-3" />
							{participants.length}
							{pluralize('participant', participants.length)}
						</div></Item
					>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<GameModeIcon class="h-3 w-3 invert" gamemode={tournament.mode} />
							{gamemodes.find((item) => item.value === tournament.mode)?.label ?? tournament.mode}
						</div>
					</Item>
					<Item>
						<p class="select-none gap-1 text-[12px]">
							{tournament.isTeam ? 'Team tournament' : 'Solo tournament'}
						</p>
					</Item>
					<Item>
						<p class="select-none gap-1 text-[12px]">
							Hosted by <a href="/users/{host.id}">{host.osuUsername}</a>
						</p>
					</Item>
				</BreadcrumbList>

				{#if isLoggedIn}
					{#if canShowRegistrationForm}
						<form method="post" action="?/{registerAction}" class="mt-2 flex flex-col gap-2">
							{#if !isRegistered && tournament.isTeam}
								<input type="hidden" name="isTeamTournament" value="true" />
								<div class="flex w-full max-w-md flex-col gap-1">
									<label for="team-name" class="text-[12px] font-medium">Team name</label>
									<input
										id="team-name"
										name="teamName"
										required
										value={form?.teamName ?? ''}
										class="border-input bg-background/90 ring-offset-background focus-visible:ring-ring h-9 rounded-md border px-3 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
										placeholder="My Awesome Team"
									/>
								</div>
								<div class="flex w-full max-w-md flex-col gap-1">
									<label for="team-participants" class="text-[12px] font-medium">
										Teammate user ids
									</label>
									<textarea
										id="team-participants"
										name="teamParticipantIds"
										required
										rows={2}
										class="border-input bg-background/90 ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
										placeholder="user_id_1, user_id_2"
									>{form?.teamParticipantIds ?? ''}</textarea>
									<p class="text-[11px] text-white/80">
										Use internal user ids, separated by comma, space, or new line.
									</p>
								</div>
							{:else if !isRegistered}
								<input type="hidden" name="isTeamTournament" value="false" />
							{/if}

							{#if form?.registrationError}
								<p class="text-xs text-red-300">{form.registrationError}</p>
							{/if}

							<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
								{registerButtonText}
							</Button>
						</form>
					{:else}
						<p class="mt-2 text-sm text-white/90">Registration is closed.</p>
					{/if}
				{/if}
			</Content>
		</Banner>
	</div>

	<Group let:Title let:Content>
		<Title>Description</Title>
		<Content class="text-justify">
			{#if tournament.description?.trim()}
				<Markdown value={tournament.description} />
			{:else}
				No description
			{/if}
		</Content>
	</Group>

	<Group let:Title let:Content>
		<Title>Rules</Title>
		<Content class="text-justify">
			{#if tournament.rules?.trim()}
				<Markdown value={tournament.rules} />
			{:else}
				No rules provided.
			{/if}
		</Content>
	</Group>
</div>
