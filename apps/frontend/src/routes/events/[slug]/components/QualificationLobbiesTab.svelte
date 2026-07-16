<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type {
		QualificationLobbyDtoOutput,
		StageDtoOutput,
		TournamentTeamDto
	} from '$lib/api/generated/model';
	import QualificationLobbyCard from '$lib/components/qualificationLobby/qualificationLobby.svelte';
	import { canSelectLobby } from '$lib/components/qualificationLobby/qualificationLobby-view';
	import { Button } from '$lib/components/ui/button';
	import type { Viewer } from '$lib/types/viewer';
	import { onDestroy } from 'svelte';

	export let stages: StageDtoOutput[];
	export let lobbies: QualificationLobbyDtoOutput[];
	export let user: Viewer | null;
	export let teams: TournamentTeamDto[];

	let submittingLobbyId: string | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;
	$: qualificationStages = stages.filter((stage) => stage.type === 'qualification');
	$: captainTeam = teams.find((team) => team.captainId === user?.id);
	$: hasActiveSync = lobbies.some((lobby) => lobby.syncStatus === 'active');
	$: {
		if (browser && hasActiveSync && !timer) timer = setInterval(() => void invalidateAll(), 10_000);
		if (browser && !hasActiveSync && timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}
	onDestroy(() => timer && clearInterval(timer));
</script>

{#if qualificationStages.length === 0}
	<p>No qualification stage added yet.</p>
{:else}
	<div class="flex flex-col gap-5">
		{#each qualificationStages as stage}
			<section class="flex flex-col gap-3">
				<h2 class="font-semibold">{stage.name}</h2>
				{#if lobbies.some((lobby) => lobby.stageId === stage.id)}
					<div class="grid gap-3 md:grid-cols-2">
						{#each lobbies.filter((lobby) => lobby.stageId === stage.id) as lobby (lobby.id)}
							<QualificationLobbyCard {lobby}>
								<div slot="selection">
									{#if user}
										<form
											method="post"
											action={captainTeam
												? '?/selectQualificationLobbyTeam'
												: '?/selectQualificationLobbySolo'}
											use:enhance={() => {
												submittingLobbyId = lobby.id;
												return async ({ update }) => {
													await update({ invalidateAll: true });
													submittingLobbyId = null;
												};
											}}
										>
											<input type="hidden" name="lobbyId" value={lobby.id} />
											{#if captainTeam}<input
													type="hidden"
													name="teamId"
													value={captainTeam.id}
												/>{/if}
											<Button
												type="submit"
												size="sm"
												disabled={!canSelectLobby(
													lobby.seatCount,
													captainTeam
														? lobby.teams.some(({ id }) => id === captainTeam?.id)
														: lobby.players.some(({ id }) => id === user?.id)
												) || submittingLobbyId !== null}
											>
												{submittingLobbyId === lobby.id ? 'Saving…' : 'Select lobby'}
											</Button>
										</form>
									{/if}
								</div>
							</QualificationLobbyCard>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No lobbies added yet.</p>
				{/if}
			</section>
		{/each}
	</div>
{/if}
