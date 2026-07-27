<script lang="ts">
	import type { QualificationStatisticsDtoOutput } from '$lib/api/generated/model';
	import type { TournamentDto } from '$lib/api/types';
	import { sortQualificationCompetitors } from '$lib/components/qualificationStatistics/qualification-statistics';

	export let data: {
		tournament: TournamentDto;
		statistics: QualificationStatisticsDtoOutput;
	};

	let sortMapId: number | null = null;
	$: competitors = sortQualificationCompetitors(data.statistics.competitors, sortMapId);
</script>

<svelte:head>
	<title>CTE - {data.tournament.name} Qualification</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<a class="text-sm text-muted-foreground hover:text-foreground" href={`/events/${data.tournament.id}`}>
			{data.tournament.name}
		</a>
		<h1 class="text-2xl font-semibold">Qualification</h1>
	</div>

	<div class="overflow-x-auto rounded-md border border-border">
		<table class="w-full min-w-max border-collapse text-sm">
			<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
				<tr>
					<th class="sticky left-0 z-10 bg-muted/30 px-4 py-3 font-semibold">
						{data.tournament.isTeam ? 'Team' : 'Player'}
					</th>
					{#each data.statistics.maps as map (map.osuBeatmapId)}
						<th
							class="px-4 py-3 font-semibold"
							aria-sort={sortMapId === map.osuBeatmapId ? 'ascending' : undefined}
						>
							<button type="button" on:click={() => (sortMapId = map.osuBeatmapId)}>
								{map.mod}{map.index} · {map.title}{sortMapId === map.osuBeatmapId ? ' ↑' : ''}
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each competitors as competitor (competitor.id)}
					<tr class="border-t border-border">
						<th class="sticky left-0 z-10 bg-background px-4 py-3 text-left font-medium">
							{competitor.name}
						</th>
						{#each data.statistics.maps as map (map.osuBeatmapId)}
							{@const result = competitor.maps.find(
								(result) => result.osuBeatmapId === map.osuBeatmapId
							)}
							<td class="px-4 py-3 whitespace-nowrap">
								{result?.gameId === null || !result
									? '—'
									: `${result.score.toLocaleString()} · #${result.place}`}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
