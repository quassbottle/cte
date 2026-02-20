<script lang="ts">
	import type { TournamentDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import TournamentCard from '$lib/components/tournamentCard/tournamentCard.svelte';

	export let data: { tournaments: TournamentDto[] };
</script>

<Group let:Title let:Content>
	<Title>Active Tournaments</Title>
	<Content class="flex flex-grow flex-wrap gap-8">
		{#each data.tournaments as tournament (tournament.id)}
			<a class="cursor-pointer" href="/events/{tournament.id}">
				<TournamentCard {...tournament} />
			</a>
		{/each}
	</Content>
</Group>
