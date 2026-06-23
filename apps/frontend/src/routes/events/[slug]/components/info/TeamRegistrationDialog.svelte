<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SelectedUser } from '$lib/schemas/user.schema';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Plus, X } from 'lucide-svelte';
	import type { TournamentRegistrationForm } from './types';

	export let form: TournamentRegistrationForm;
	export let onClose: () => void;

	let teamName = form?.teamName ?? '';
	let teammateQuery = '';
	let lookupError = '';
	let isLookupPending = false;
	let selectedUsers: SelectedUser[] = form?.selectedUsers ?? [];

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

		try {
			const response = await fetch(`/api/users/lookup?query=${encodeURIComponent(query)}`);
			if (!response.ok) {
				lookupError = 'User not found.';
				return;
			}

			addSelectedUser(await response.json());
		} finally {
			isLookupPending = false;
		}
	};
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	on:click={(event) => {
		if (event.target === event.currentTarget) onClose();
	}}
	on:keydown={(event) => {
		if (event.key === 'Escape') onClose();
	}}
>
	<div class="w-full max-w-2xl rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div>
				<p class="text-xl font-semibold">Register Team</p>
				<p class="text-sm text-muted-foreground">
					Add teammates by osu id or osu username. Local id is also supported.
				</p>
			</div>
			<Button variant="ghost" size="icon" on:click={onClose}>
				<X class="h-4 w-4" />
			</Button>
		</div>

		<form method="post" action="?/register" use:enhance class="flex flex-col gap-4">
			<input type="hidden" name="isTeamTournament" value="true" />
			<input type="hidden" name="teamParticipantIds" value={selectedUsers.map((user) => user.id).join(',')} />

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
					<p class="text-xs text-destructive">{lookupError}</p>
				{/if}

				{#if selectedUsers.length > 0}
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{#each selectedUsers as user}
							<div class="relative rounded-lg border border-border p-3">
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
										<p class="truncate text-xs text-muted-foreground">
											id: {user.id} | osu: {user.osuId}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-muted-foreground">No teammates added yet.</p>
				{/if}
			</div>

			{#if form?.registrationError}
				<p class="text-xs text-destructive">{form.registrationError}</p>
			{/if}

			<div class="flex items-center gap-2">
				<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
					Register team
				</Button>
				<Button type="button" variant="outline" class="text-[12px]" on:click={onClose}>Cancel</Button>
			</div>
		</form>
	</div>
</div>
