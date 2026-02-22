<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/api';
	import type { TournamentDto, TournamentParticipantDto, UserDto, UserSession } from '$lib/api/types';
	import { gamemodes } from '$lib/utils/types';
	import { pluralize } from '$lib/utils/text';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import Banner from '$lib/components/banner/banner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Calendar, Plus, UserRound, X } from 'lucide-svelte';
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

	type SelectedUser = Pick<UserDto, 'id' | 'osuId' | 'osuUsername' | 'avatarUrl'>;

	const parseParticipantIds = (rawValue: string | undefined): string[] =>
		Array.from(
			new Set(
				String(rawValue ?? '')
					.split(/[\s,]+/)
					.map((value) => value.trim())
					.filter((value) => value.length > 0)
			)
		);

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

	let isRegistrationModalOpen = Boolean(form?.registrationError);
	let teamName = form?.teamName ?? '';
	let teammateQuery = '';
	let lookupError = '';
	let isLookupPending = false;
	let selectedUsers: SelectedUser[] = [];

	onMount(async () => {
		const idsFromForm = parseParticipantIds(form?.teamParticipantIds);
		if (!idsFromForm.length) {
			return;
		}

		const resolvedUsers = await Promise.all(
			idsFromForm.map(async (id) => {
				const response = await api().users().getById(id);
				return response.result;
			})
		);

		selectedUsers = resolvedUsers
			.filter((candidate): candidate is UserDto => Boolean(candidate))
			.map((candidate) => ({
				id: candidate.id,
				osuId: candidate.osuId,
				osuUsername: candidate.osuUsername,
				avatarUrl: candidate.avatarUrl
			}));
	});

	const addSelectedUser = (user: SelectedUser) => {
		if (selectedUsers.some((candidate) => candidate.id === user.id)) {
			lookupError = 'User already added.';
			return;
		}

		selectedUsers = [...selectedUsers, user];
		lookupError = '';
		teammateQuery = '';
	};

	const removeSelectedUser = (userId: string) => {
		selectedUsers = selectedUsers.filter((user) => user.id !== userId);
	};

	const lookupAndAddUser = async () => {
		const query = teammateQuery.trim();
		if (!query) {
			lookupError = 'Enter osu id or osu username (local id also supported).';
			return;
		}

		isLookupPending = true;
		lookupError = '';
		const response = await api().users().lookup(query);
		isLookupPending = false;

		if (!response.success || !response.result) {
			lookupError = response.error?.message ?? 'User not found.';
			return;
		}

		addSelectedUser(response.result);
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
						{#if !isRegistered && tournament.isTeam}
							<div class="mt-2">
								<Button
									class="w-[140px] bg-accept text-[12px]"
									variant="accept"
									on:click={() => {
										isRegistrationModalOpen = true;
										lookupError = '';
									}}
								>
									{registerButtonText}
								</Button>
							</div>

							{#if isRegistrationModalOpen}
								<div
									class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
									role="dialog"
									aria-modal="true"
									tabindex="-1"
									on:click={(event) => {
										if (event.target === event.currentTarget) {
											isRegistrationModalOpen = false;
										}
									}}
									on:keydown={(event) => {
										if (event.key === 'Escape') {
											isRegistrationModalOpen = false;
										}
									}}
								>
									<div class="w-full max-w-2xl rounded-xl bg-white p-6 text-black shadow-2xl">
										<div class="mb-4 flex items-start justify-between gap-4">
											<div>
												<p class="text-xl font-semibold">Register Team</p>
												<p class="text-sm text-black/60">
													Add teammates by osu id or osu username. Local id is also supported.
												</p>
											</div>
											<Button variant="ghost" size="icon" on:click={() => (isRegistrationModalOpen = false)}>
												<X class="h-4 w-4" />
											</Button>
										</div>

										<form method="post" action="?/register" class="flex flex-col gap-4">
											<input type="hidden" name="isTeamTournament" value="true" />
											<input
												type="hidden"
												name="teamParticipantIds"
												value={selectedUsers.map((user) => user.id).join(',')}
											/>

											<div class="flex w-full flex-col gap-1">
												<label for="team-name-modal" class="text-[12px] font-medium">Team name</label>
												<input
													id="team-name-modal"
													name="teamName"
													required
													bind:value={teamName}
													class="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
													placeholder="My Awesome Team"
												/>
											</div>

											<div class="flex flex-col gap-2">
												<p class="text-[12px] font-medium">Teammates</p>
												<div class="flex flex-col gap-2 sm:flex-row">
													<input
														name="teamParticipantLookup"
														class="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
														placeholder="osu id / osu username"
														bind:value={teammateQuery}
														on:keydown={(event) => {
															if (event.key === 'Enter') {
																event.preventDefault();
																void lookupAndAddUser();
															}
														}}
													/>
													<Button
														type="button"
														variant="outline"
														class="gap-1"
														on:click={() => void lookupAndAddUser()}
														disabled={isLookupPending}
													>
														<Plus class="h-4 w-4" />
														Add user
													</Button>
												</div>

												{#if lookupError}
													<p class="text-xs text-red-600">{lookupError}</p>
												{/if}

												{#if selectedUsers.length > 0}
													<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
														{#each selectedUsers as user}
															<div class="relative rounded-lg border border-black/10 p-3">
																<Button
																	type="button"
																	size="icon"
																	variant="ghost"
																	class="absolute right-1 top-1 h-7 w-7"
																	on:click={() => removeSelectedUser(user.id)}
																>
																	<X class="h-4 w-4" />
																</Button>
																<div class="flex items-center gap-3 pr-8">
																	<Avatar class="h-10 w-10">
																		<AvatarImage src={user.avatarUrl} alt={user.osuUsername} />
																		<AvatarFallback>{user.osuUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
																	</Avatar>
																	<div class="min-w-0">
																		<p class="truncate text-sm font-medium">{user.osuUsername}</p>
																		<p class="truncate text-xs text-black/60">
																			id: {user.id} | osu: {user.osuId}
																		</p>
																	</div>
																</div>
															</div>
														{/each}
													</div>
												{:else}
													<p class="text-xs text-black/60">No teammates added yet.</p>
												{/if}
											</div>

											{#if form?.registrationError}
												<p class="text-xs text-red-600">{form.registrationError}</p>
											{/if}

											<div class="flex items-center gap-2">
												<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
													Register team
												</Button>
												<Button type="button" variant="outline" on:click={() => (isRegistrationModalOpen = false)}>
													Cancel
												</Button>
											</div>
										</form>
									</div>
								</div>
							{/if}
						{:else}
							<form method="post" action="?/{registerAction}" class="mt-2 flex flex-col gap-2">
								{#if !isRegistered}
									<input type="hidden" name="isTeamTournament" value="false" />
								{/if}

								{#if form?.registrationError}
									<p class="text-xs text-red-300">{form.registrationError}</p>
								{/if}

								<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
									{registerButtonText}
								</Button>
							</form>
						{/if}
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
