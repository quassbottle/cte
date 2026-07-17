<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, TournamentTeamDto } from '$lib/api/types';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';
	import RosterGroups from './RosterGroups.svelte';

	export let tournament: TournamentDto;
	export let participants: TournamentParticipantDto[];
	export let teams: TournamentTeamDto[];
</script>

<div class="flex flex-col gap-3">
	{#if tournament.isTeam}
		{#if teams.length === 0}
			<p>Be the first team to register ;)</p>
		{:else}
			<RosterGroups
				groups={teams.map((team) => ({
					id: team.id,
					name: team.name,
					seed: team.seed,
					members: team.participants
				}))}
			/>
		{/if}
	{:else}
		<div class="flex flex-grow flex-wrap gap-3">
			{#each participants as participant}
				<a href="/users/{participant.id}">
					<PlayerCard
						avatarUrl={participant.avatarUrl}
						username={participant.osuUsername}
						seed={participant.seed}
					/>
				</a>
			{:else}
				<p>Be the first one to register ;)</p>
			{/each}
		</div>
	{/if}
</div>
