<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto } from '$lib/api/types';
	import type { Viewer } from '$lib/types/viewer';
	import { Button } from '$lib/components/ui/button';
	import RegisterDialog from './RegisterDialog.svelte';
	import TeamRegistrationDialog from './TeamRegistrationDialog.svelte';
	import UnregisterDialog from './UnregisterDialog.svelte';
	import type { TournamentRegistrationForm } from './types';

	export let tournament: TournamentDto;
	export let user: Viewer | null;
	export let participants: TournamentParticipantDto[];
	export let form: TournamentRegistrationForm;

	$: isLoggedIn = Boolean(user?.id);
	$: isRegistered = Boolean(
		user?.id && participants.some((participant) => participant.id === user?.id)
	);
	$: canShowRegistrationForm = tournament.registrationOpen && !tournament.archivedAt;
	$: registerButtonText = isRegistered
		? tournament.isTeam
			? 'Unregister team'
			: 'Unregister'
		: tournament.isTeam
			? 'Register team'
			: 'Register';

	let isRegistrationModalOpen = Boolean(form?.registrationError);
	let isSoloRegisterModalOpen = false;
	let isUnregisterModalOpen = false;

	// `use:enhance` form submissions preserve local component state across the
	// client-side redirect, so a stale modal flag from a prior register/unregister
	// flow would auto-open the wrong dialog when the relevant conditional block
	// re-mounts (e.g. after unregister -> register again). Reset the flags based
	// on the canonical registration state to neutralise that sticky state.
	$: if (isRegistered) {
		isRegistrationModalOpen = false;
		isSoloRegisterModalOpen = false;
	}
	$: if (!isRegistered) {
		isUnregisterModalOpen = false;
	}
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
				<TeamRegistrationDialog {form} onClose={() => (isRegistrationModalOpen = false)} />
			{/if}
		{:else}
			<div class="mt-2 flex flex-col gap-2">
				{#if form?.registrationError}
					<p class="text-xs text-destructive">{form.registrationError}</p>
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
					<Button
						class="w-[140px] bg-accept text-[12px]"
						variant="accept"
						type="button"
						on:click={() => (isSoloRegisterModalOpen = true)}
					>
						{registerButtonText}
					</Button>

					{#if isSoloRegisterModalOpen}
						<RegisterDialog
							{form}
							label={registerButtonText}
							onClose={() => (isSoloRegisterModalOpen = false)}
						/>
					{/if}
				{/if}
			</div>
		{/if}
	{:else if tournament.archivedAt}
		<p class="mt-2 text-sm text-white/90">Archived tournaments are closed.</p>
	{:else}
		<p class="mt-2 text-sm text-white/90">Registration is closed.</p>
	{/if}
{:else if tournament.registrationOpen && !tournament.archivedAt}
	<p class="mt-2 text-sm text-white/90">Sign in to register.</p>
{/if}
