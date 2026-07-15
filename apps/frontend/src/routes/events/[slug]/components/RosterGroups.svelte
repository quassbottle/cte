<script lang="ts">
	import type { TournamentParticipantDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';

	export let groups: { id: string; name: string; members: TournamentParticipantDto[] }[];
</script>

{#each groups as group (group.id)}
	<Group let:Title let:Content>
		<Title>{group.name}</Title>
		<Content class="flex flex-wrap gap-3">
			{#each group.members as member (member.id)}
				<a href="/users/{member.id}">
					<PlayerCard avatarUrl={member.avatarUrl} username={member.osuUsername} />
				</a>
			{/each}
		</Content>
	</Group>
{/each}
