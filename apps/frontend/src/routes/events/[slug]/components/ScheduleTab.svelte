<script lang="ts">
	import { page } from '$app/stores';
	import type {
		QualificationLobbyDtoOutput,
		StageScheduleDtoOutput,
		TournamentTeamDto
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import type { Viewer } from '$lib/types/viewer';
	import Schedule from '$lib/components/schedule/schedule.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import QualificationLobbiesTab from './QualificationLobbiesTab.svelte';

	export let schedule: StageScheduleDtoOutput[];
	export let lobbies: QualificationLobbyDtoOutput[];
	export let beatmaps: MappoolBeatmapDto[];
	export let user: Viewer | null;
	export let teams: TournamentTeamDto[];
	export let isTeam: boolean;

	$: requestedStageId = $page.url.searchParams.get('stage');
	$: activeStageId = getActiveStageId(requestedStageId);

	function getActiveStageId(value: string | null) {
		if (value && schedule.some((stage) => stage.id === value)) {
			return value;
		}

		return schedule[0]?.id ?? '';
	}

	function getStageTabHref(stageId: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', 'schedule');
		params.set('stage', stageId);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}
</script>

<div class="flex flex-col gap-3">
	{#if schedule.length === 0}
		<p>No stages added yet.</p>
	{:else}
		<TabGroup
			value={activeStageId}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each schedule as stage}
						<Item
							value={stage.id}
							href={getStageTabHref(stage.id)}
							class="mr-0"
							buttonClass={buttonVariants({
								variant: 'default',
								size: 'sm',
								className: 'w-full justify-center'
							})}
						>
							{stage.name}
						</Item>
					{/each}
				</Head>
			</div>

			<div class="min-w-0 flex-1 md:border-l md:border-border md:pl-6">
				{#each schedule as stage}
					<ContentItem class="flex flex-col gap-3" value={stage.id}>
						{#if stage.type === 'qualification'}
							<QualificationLobbiesTab stages={[stage]} {lobbies} {beatmaps} {user} {teams} {isTeam} />
						{:else if stage.matches.length === 0}
							<p class="py-16 text-center text-sm text-muted-foreground">No matches added yet.</p>
						{:else}
							<Schedule matches={stage.matches} />
						{/if}
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>
