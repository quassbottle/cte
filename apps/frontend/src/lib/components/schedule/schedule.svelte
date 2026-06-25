<script lang="ts">
	import type { StageScheduleDtoOutputMatchesItem } from '$lib/api/generated/model';
	import Match from '$lib/components/match/match.svelte';
	import MatchCard from '$lib/components/match/MatchCard.svelte';
	import { toMatchView } from './schedule-view';

	export let matches: StageScheduleDtoOutputMatchesItem[];

	$: viewMatches = matches.map(toMatchView);
</script>

<section class="w-full overflow-hidden rounded-md border border-border">
	<div class="hidden overflow-x-auto md:block">
		<table class="w-full min-w-[900px] border-collapse text-sm">
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
				</tr>
			</thead>
			<tbody>
				{#each viewMatches as match}
					<Match {match} />
				{/each}
			</tbody>
		</table>
	</div>

	<div class="divide-y divide-border md:hidden">
		{#each viewMatches as match}
			<MatchCard {match} />
		{/each}
	</div>
</section>
