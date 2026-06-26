<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, StageDto, TournamentDto } from '$lib/api/types';
	import type { StageScheduleDtoOutput } from '$lib/api/generated/model';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import MappoolsTab from './components/mappools/MappoolsTab.svelte';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import ScheduleTab from './components/ScheduleTab.svelte';
	import StagesTab from './components/StagesTab.svelte';
	import TournamentTab from './components/TournamentTab.svelte';

	export let data: {
		tournament: TournamentDto;
		stages: StageDto[];
		schedule: StageScheduleDtoOutput[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	};
	export let form: TournamentEditActionResult | undefined;

	const editTabs = ['tournament', 'stages', 'schedule', 'mappools'] as const;
	type EditTab = (typeof editTabs)[number];

	function isEditTab(value: string | null): value is EditTab {
		return editTabs.some((tab) => tab === value);
	}

	function getEditTabHref(tab: EditTab) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', tab);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}

	function getActiveEditTab(value: string | null): EditTab {
		return isEditTab(value) ? value : 'tournament';
	}

	$: activeTab = getActiveEditTab($page.url.searchParams.get('tab'));
</script>

<svelte:head>
	<title>CTE - Edit {data.tournament.name}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<TabGroup value={activeTab} let:Head let:ContentItem>
		<div class="mb-4 flex items-start justify-between">
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				<Item value="tournament" href={getEditTabHref('tournament')}>Tournament</Item>
				<Item value="stages" href={getEditTabHref('stages')}>Stages</Item>
				<Item value="schedule" href={getEditTabHref('schedule')}>Schedule</Item>
				<Item value="mappools" href={getEditTabHref('mappools')}>Mappools</Item>
			</Head>

			<a href="/events/{data.tournament.id}">
				<Button class="w-[120px] text-[12px]" variant="outline">View</Button>
			</a>
		</div>

		<ContentItem value="tournament">
			<TournamentTab tournament={data.tournament} {form} />
		</ContentItem>

		<ContentItem value="stages">
			<StagesTab tournament={data.tournament} stages={data.stages} {form} />
		</ContentItem>

		<ContentItem value="schedule">
			<ScheduleTab stages={data.stages} schedule={data.schedule} {form} />
		</ContentItem>

		<ContentItem value="mappools">
			<MappoolsTab
				tournamentMode={data.tournament.mode}
				stages={data.stages}
				mappools={data.mappools}
				mappoolBeatmaps={data.mappoolBeatmaps}
				{form}
			/>
		</ContentItem>
	</TabGroup>
</div>
