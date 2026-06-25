<script lang="ts">
	import type { MatchView } from './types';
	import MatchLink from './MatchLink.svelte';
	import PlayerCell from './PlayerCell.svelte';
	import StaffList from './StaffList.svelte';

	export let match: MatchView;
</script>

<tr class="border-t border-border">
	<td class="px-4 py-4 font-medium text-muted-foreground">{match.number}</td>
	<td class="px-4 py-4">
		<p class="font-semibold">{match.date}</p>
		<p class="text-xs text-muted-foreground">{match.time}</p>
	</td>
	<td class="px-4 py-4">
		<PlayerCell player={match.player1} />
	</td>
	<td class="px-4 py-4 text-center">
		<div class="flex items-center justify-center gap-3">
			<span class="text-xl font-semibold">{match.player1?.score ?? ''}</span>
			<span class="text-xs font-semibold text-muted-foreground">vs</span>
			<span class="text-xl font-semibold text-muted-foreground">
				{match.player2?.score ?? ''}
			</span>
		</div>
	</td>
	<td class="px-4 py-4">
		<PlayerCell player={match.player2} side="right" />
	</td>
	<td class="px-4 py-4">
		<StaffList staff={match.staff} />
	</td>
	<td class="px-4 py-4 text-center">
		<MatchLink href={match.mpUrl} type="mp" />
	</td>
	<td class="px-4 py-4 text-center">
		<MatchLink href={match.vodUrl} type="vod" />
	</td>
</tr>
