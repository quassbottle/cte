<script lang="ts">
	import { enhance } from '$app/forms';
	import type { TournamentDto, TournamentParticipantDto } from '$lib/api/types';
	import type { Viewer } from '$lib/types/viewer';
	import { Button } from '$lib/components/ui/button';
	import TeamRegistrationDialog from './TeamRegistrationDialog.svelte';
	import UnregisterDialog from './UnregisterDialog.svelte';
	import type { TournamentRegistrationForm } from './types';

	export let tournament: TournamentDto;
	export let user: Viewer | null;
	export let participants: TournamentParticipantDto[];
	export let form: TournamentRegistrationForm;

	$: isLoggedIn = Boolean(user?.id);
	$: isRegistered = Boolean(user?.id && participants.some((participant) => participant.id === user?.id));
	$: canShowRegistrationForm = tournament.registrationOpen || isRegistered;
	$: registerButtonText = isRegistered
		? tournament.isTeam
			? 'Unregister team'
			: 'Unregister'
		: tournament.isTeam
			? 'Register team'
			: 'Register';

	let isRegistrationModalOpen = Boolean(form?.registrationError);
	let isUnregisterModalOpen = false;
</script>

{#if isLoggedIn}
	{#if canShowRegistrationForm}
		{#if !isRegistered && tournament.isTeam}
			<div class="mt-2">
				<Button
					class="w-[140px] bg-accept text-[12px]"
					variant="accept"
					on:click={() => (isRegistrationModalOpen = true)}
				>
					{registerButtonText}
				</Button>
			</div>

			{#if isRegistrationModalOpen}
				<TeamRegistrationDialog
					{form}
					onClose={() => (isRegistrationModalOpen = false)}
				/>
			{/if}
		{:else}
			<div class="mt-2 flex flex-col gap-2">
				{#if form?.registrationError}
					<p class="text-xs text-red-300">{form.registrationError}</p>
				{/if}

				{#if isRegistered}
					<Button
						class="w-[140px] bg-accept text-[12px]"
						variant="accept"
						type="button"
						on:click={() => (isUnregisterModalOpen = true)}
					>
						{registerButtonText}
					</Button>

					{#if isUnregisterModalOpen}
						<UnregisterDialog
							label={registerButtonText}
							onClose={() => (isUnregisterModalOpen = false)}
						/>
					{/if}
				{:else}
					<form method="post" action="?/register" use:enhance class="flex flex-col gap-2">
						<input type="hidden" name="isTeamTournament" value="false" />

						<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
							{registerButtonText}
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="mt-2 text-sm text-white/90">Registration is closed.</p>
	{/if}
{:else if tournament.registrationOpen}
	<p class="mt-2 text-sm text-white/90">Sign in to register.</p>
{/if}
