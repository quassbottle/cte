<script lang="ts">
	import type { StageScheduleDtoOutputMatchesItem } from '$lib/api/generated/model';
	import Match from '$lib/components/match/match.svelte';
	import MatchCard from '$lib/components/match/MatchCard.svelte';
	import ScheduleTable from './ScheduleTable.svelte';
	import { toMatchView } from './schedule-view';

	export let matches: StageScheduleDtoOutputMatchesItem[];
	export let editable = false;

	$: viewMatches = matches.map(toMatchView);
</script>

<ScheduleTable>
	<svelte:fragment slot="header">
		<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
			<tr>
				<th class="w-16 px-4 py-3 font-semibold">ID</th>
				<th class="w-40 px-4 py-3 font-semibold">Time</th>
				<th class="px-4 py-3 font-semibold">Player 1</th>
				<th class="w-32 px-4 py-3 text-center font-semibold">Score</th>
				<th class="px-4 py-3 text-right font-semibold">Player 2</th>
				<th class="w-56 px-4 py-3 font-semibold">Staff</th>
				<th class="w-16 px-4 py-3 text-center font-semibold">MP</th>
				<th class="w-16 px-4 py-3 text-center font-semibold">VOD</th>
				{#if editable}
					<th class="w-36 px-4 py-3 text-right font-semibold">Actions</th>
				{/if}
			</tr>
		</thead>
	</svelte:fragment>
	<svelte:fragment slot="rows">
		<tbody>
			{#each viewMatches as match, index}
				<Match {match} {editable}>
					<svelte:fragment slot="actions">
						<slot name="actions" match={matches[index]} />
					</svelte:fragment>
				</Match>
			{/each}
		</tbody>
	</svelte:fragment>
	<svelte:fragment slot="mobile">
		{#each viewMatches as match, index}
			<div>
				<MatchCard {match} />
				{#if editable}
					<div class="border-t border-border p-4">
						<slot name="actions" match={matches[index]} />
					</div>
				{/if}
			</div>
		{/each}
	</svelte:fragment>
</ScheduleTable>
