<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, TournamentTeamDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';

	export let tournament: TournamentDto;
	export let participants: TournamentParticipantDto[];
	export let teams: TournamentTeamDto[];
</script>

<div class="flex flex-col gap-3">
	{#if tournament.isTeam}
		{#if teams.length === 0}
			<p>Be the first team to register ;)</p>
		{:else}
			{#each teams as team}
				<Group let:Title let:Content>
					<Title>{team.name}</Title>
					<Content class="flex flex-wrap gap-3">
						{#each team.participants as participant}
							<a href="/users/{participant.id}">
								<PlayerCard osuId={participant.osuId} username={participant.osuUsername} />
							</a>
						{/each}
					</Content>
				</Group>
			{/each}
		{/if}
	{:else}
		<div class="flex flex-grow flex-wrap gap-3">
			{#each participants as participant}
				<a href="/users/{participant.id}">
					<PlayerCard osuId={participant.osuId} username={participant.osuUsername} />
				</a>
			{:else}
				<p>Be the first one to register ;)</p>
			{/each}
		</div>
	{/if}
</div>
