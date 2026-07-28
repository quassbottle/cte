<script lang="ts">
	import { page } from '$app/stores';
	import type {
		QualificationLobbyDtoOutput,
		QualificationStatisticsDtoOutput
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import QualificationLobbyDetailDialog from '$lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte';
	import { ExternalLink } from 'lucide-svelte';

	export let statistics: QualificationStatisticsDtoOutput;
	export let lobbies: QualificationLobbyDtoOutput[];
	export let beatmaps: MappoolBeatmapDto[];
	export let isTeam: boolean;

	let selectedLobbyId: string | null = null;
	$: selectedLobby = lobbies.find(({ id }) => id === selectedLobbyId);
	$: activeSortBeatmapId = Number($page.url.searchParams.get('sortBeatmapId')) || null;
	$: activeSortDirection =
		$page.url.searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';

	const lobbyFor = (competitorId: string) =>
		lobbies.find((lobby) =>
			(isTeam ? lobby.teams : lobby.players).some(({ id }) => id === competitorId)
		);

	const sortHref = (osuBeatmapId: number) => {
		const params = new URLSearchParams($page.url.searchParams);
		const direction =
			activeSortBeatmapId === osuBeatmapId && activeSortDirection === 'asc' ? 'desc' : 'asc';
		params.set('tab', 'qualification');
		params.set('sortBeatmapId', String(osuBeatmapId));
		params.set('sortDirection', direction);
		return `${$page.url.pathname}?${params}`;
	};
</script>

<div class="w-full max-w-full overflow-x-auto rounded-md border border-border">
	<table class="min-w-max border-collapse text-sm">
		<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
			<tr>
				<th class="sticky left-0 z-20 min-w-56 bg-background px-4 py-3 font-semibold">
					{isTeam ? 'Team' : 'Player'}
				</th>
				{#each statistics.maps as map (map.osuBeatmapId)}
					<th
						class="min-w-48 p-2 font-normal normal-case"
						aria-sort={activeSortBeatmapId === map.osuBeatmapId
							? activeSortDirection === 'desc'
								? 'descending'
								: 'ascending'
							: undefined}
					>
						<a
							class="group relative block h-20 w-48 overflow-hidden rounded-md text-left text-white"
							href={sortHref(map.osuBeatmapId)}
						>
							<img
								class="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
								src={map.coverUrl}
								alt=""
							/>
							<span class="absolute inset-0 bg-black/65"></span>
							<span class="relative flex h-full flex-col justify-end p-2 leading-tight">
								<strong class="text-xs">
									{map.mod}{map.index}
									{activeSortBeatmapId === map.osuBeatmapId
										? activeSortDirection === 'desc'
											? ' ↓'
											: ' ↑'
										: ''}
								</strong>
								<span class="truncate font-medium">{map.title}</span>
								<span class="truncate text-xs opacity-80">{map.difficultyName}</span>
							</span>
						</a>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each statistics.competitors as competitor (competitor.id)}
				{@const lobby = lobbyFor(competitor.id)}
				<tr class="border-t border-border">
					<th
						class="sticky left-0 z-10 min-w-56 bg-background px-4 py-4 text-left font-semibold"
					>
						<div class="flex items-center gap-2">
							<span class="text-muted-foreground">#{competitor.seed}</span>
							<span>{competitor.name}</span>
							{#if lobby}
								<button
									type="button"
									class="inline-flex text-primary hover:text-primary/80"
									on:click={() => (selectedLobbyId = lobby.id)}
									aria-label={`Open ${competitor.name} qualification history`}
								>
									<ExternalLink class="h-4 w-4" />
								</button>
							{/if}
						</div>
					</th>
					{#each statistics.maps as map (map.osuBeatmapId)}
						{@const result = competitor.maps.find(
							(item) => item.osuBeatmapId === map.osuBeatmapId
						)}
						<td class="min-w-48 px-4 py-4 whitespace-nowrap">
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

{#if selectedLobby}
	<QualificationLobbyDetailDialog
		lobby={selectedLobby}
		{beatmaps}
		onClose={() => (selectedLobbyId = null)}
	/>
{/if}
