<script lang="ts">
	import type { MatchView } from './types';
	import MatchLinks from './MatchLinks.svelte';
	import MatchStatusBadge from './MatchStatusBadge.svelte';
	import PlayerCell from './PlayerCell.svelte';
	import StaffList from './StaffList.svelte';

	export let match: MatchView;
</script>

<article class="flex flex-col gap-4 p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="mb-1 flex items-center gap-2">
				<p class="text-xs font-semibold text-muted-foreground">Match {match.number}</p>
				<MatchStatusBadge status={match.status} />
			</div>
			<p class="font-semibold">{match.date}</p>
			<p class="text-xs text-muted-foreground">{match.time} UTC+0</p>
		</div>
		<MatchLinks mpUrl={match.mpUrl} vodUrl={match.vodUrl} />
	</div>

	<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<div class="min-w-0">
			{#if match.redTeam}
				<p class="truncate font-semibold">{match.redTeam.name}</p>
			{:else}
				<PlayerCell player={match.player1} compact />
			{/if}
		</div>
		<div class="text-center">
			<p class="text-lg font-semibold">
				{match.redTeam?.score ?? match.player1?.score ?? '-'} : {match.blueTeam?.score ??
					match.player2?.score ??
					'-'}
			</p>
			<p class="text-[11px] uppercase text-muted-foreground">score</p>
		</div>
		<div class="min-w-0">
			{#if match.blueTeam}
				<p class="truncate text-right font-semibold">{match.blueTeam.name}</p>
			{:else}
				<PlayerCell player={match.player2} side="right" compact />
			{/if}
		</div>
	</div>

	<StaffList staff={match.staff} compact />
</article>
