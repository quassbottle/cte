<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type {
		QualificationLobbyDtoOutput,
		StageScheduleDtoOutput,
		StageStatisticsDtoOutput
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto, StageDto } from '$lib/api/types';
	import QualificationLobbyDetailDialog from '$lib/components/qualificationLobby/QualificationLobbyDetailDialog.svelte';
	import MatchHistoryDialog from '$lib/components/schedule/MatchHistoryDialog.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { ExternalLink } from 'lucide-svelte';
	import { statisticsSortHref, statisticsViewHref } from './statistics-sort';

	export let statistics: StageStatisticsDtoOutput;
	export let stages: StageDto[];
	export let schedule: StageScheduleDtoOutput[];
	export let tournamentId: string;
	export let lobbies: QualificationLobbyDtoOutput[];
	export let beatmaps: MappoolBeatmapDto[];
	export let isTeam: boolean;

	let selectedLobbyId: string | null = null;
	let selectedMatchId: string | null = null;
	$: selectedLobby = lobbies.find(({ id }) => id === selectedLobbyId);
	$: selectedMatch = schedule
		.flatMap(({ matches }) => matches)
		.find(({ id }) => id === selectedMatchId);
	$: isQualification = stages.find(({ id }) => id === statistics.stageId)?.type === 'qualification';
	$: playerView = isTeam && $page.url.searchParams.get('view') === 'players';
	$: activeSortBeatmapId = Number($page.url.searchParams.get('sortBeatmapId')) || null;
	$: activeSortDirection = $page.url.searchParams.get('sortDirection') === 'desc' ? 'desc' : 'asc';
	$: teamsHref = statisticsViewHref(new URL($page.url), 'teams', statistics.stageId);
	$: playersHref = statisticsViewHref(new URL($page.url), 'players', statistics.stageId);

	const lobbyFor = (competitorId: string) =>
		lobbies.find((lobby) =>
			(isTeam ? lobby.teams : lobby.players).some(({ id }) => id === competitorId)
		);

	const applySort = (beatmapId: number | null) =>
		goto(statisticsSortHref(new URL(window.location.href), beatmapId), {
			invalidateAll: true
		});

	const stageHref = (stageId: string) => {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', 'statistics');
		params.set('stage', stageId);
		params.delete('sortBeatmapId');
		params.delete('sortDirection');
		return `${$page.url.pathname}?${params}`;
	};
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<nav class="flex flex-wrap gap-2" aria-label="Statistics stage">
		{#each stages as stage (stage.id)}
			<a
				class={buttonVariants({ variant: 'stage', size: 'sm' })}
				aria-current={stage.id === statistics.stageId ? 'page' : undefined}
				href={stageHref(stage.id)}>{stage.name}</a
			>
		{/each}
	</nav>

	{#if isTeam}
		<nav class="flex gap-2" aria-label="Statistics view">
			<a
				class={buttonVariants({ variant: 'stage', size: 'sm' })}
				aria-current={!playerView ? 'page' : undefined}
				href={teamsHref}>Teams</a
			>
			<a
				class={buttonVariants({ variant: 'stage', size: 'sm' })}
				aria-current={playerView ? 'page' : undefined}
				href={playersHref}>Players</a
			>
		</nav>
	{/if}
</div>

<div class="w-full max-w-full overflow-x-auto rounded-md border border-border">
	<table class="min-w-max border-collapse text-sm">
		<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
			<tr>
				<th
					class="sticky left-0 z-20 min-w-56 bg-background px-4 py-3 font-semibold"
					aria-sort={activeSortBeatmapId === null
						? activeSortDirection === 'desc'
							? 'descending'
							: 'ascending'
						: undefined}
				>
					<button type="button" class="hover:text-foreground" on:click={() => applySort(null)}>
						{playerView || !isTeam ? 'Player' : 'Team'}{activeSortBeatmapId === null
							? activeSortDirection === 'desc'
								? ' ↓'
								: ' ↑'
							: ''}
					</button>
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
						<button
							type="button"
							class="group relative block h-20 w-48 overflow-hidden rounded-md text-left text-white"
							on:click={() => applySort(map.osuBeatmapId)}
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
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each statistics.competitors as competitor (competitor.id)}
				{@const lobby = isQualification && !playerView ? lobbyFor(competitor.id) : undefined}
				<tr class="border-t border-border">
					<th class="sticky left-0 z-10 min-w-56 bg-background px-4 py-4 text-left font-semibold">
						<div class="flex items-center gap-2">
							{#if competitor.seed && !playerView}<span class="text-muted-foreground"
									>#{competitor.seed}</span
								>{/if}
							<div>
								<div>{competitor.name}</div>
								{#if playerView && competitor.teamName}
									<div class="text-xs font-normal text-muted-foreground">{competitor.teamName}</div>
								{/if}
							</div>
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
						{@const result = competitor.maps.find((item) => item.osuBeatmapId === map.osuBeatmapId)}
						<td class="min-w-48 whitespace-nowrap px-4 py-4">
							{#if !result?.attempts.length}
								—
							{:else}
								<div class="space-y-1">
									{#each result.attempts as attempt (attempt.gameId)}
										<div class="flex items-center gap-2">
											<span>{attempt.score.toLocaleString()} · #{attempt.place}</span>
											{#if attempt.lobbyId}
												<button
													type="button"
													class="text-primary hover:text-primary/80"
													aria-label="Open qualification history"
													on:click={() => (selectedLobbyId = attempt.lobbyId ?? null)}
												>
													<ExternalLink class="h-4 w-4" />
												</button>
											{:else if attempt.matchId}
												<button
													type="button"
													class="text-primary hover:text-primary/80"
													aria-label="Open match history"
													on:click={() => (selectedMatchId = attempt.matchId)}
												>
													<ExternalLink class="h-4 w-4" />
												</button>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if selectedLobby}
	<QualificationLobbyDetailDialog
		{tournamentId}
		lobby={selectedLobby}
		{beatmaps}
		onClose={() => (selectedLobbyId = null)}
	/>
{/if}

{#if selectedMatch}
	<MatchHistoryDialog
		{tournamentId}
		match={selectedMatch}
		{beatmaps}
		onClose={() => (selectedMatchId = null)}
	/>
{/if}
