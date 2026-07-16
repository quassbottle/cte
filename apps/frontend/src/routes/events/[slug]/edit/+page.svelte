<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, StageDto, TournamentDto } from '$lib/api/types';
	import type { AugmentedZodDtoOutput, StageScheduleDtoOutput } from '$lib/api/generated/model';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import MappoolsTab from './components/mappools/MappoolsTab.svelte';
	import ParticipantsTab from './components/ParticipantsTab.svelte';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import ScheduleTab from './components/ScheduleTab.svelte';
	import QualificationLobbiesTab from './components/QualificationLobbiesTab.svelte';
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import StagesTab from './components/StagesTab.svelte';
	import TournamentTab from './components/TournamentTab.svelte';
	import StaffTab from './components/StaffTab.svelte';
	import type { TournamentStaffRole } from '$lib/types/tournament-staff';

	export let data: {
		tournament: TournamentDto;
		stages: StageDto[];
		schedule: StageScheduleDtoOutput[];
		qualificationLobbies: QualificationLobbyDtoOutput[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
		qualificationRoster: AugmentedZodDtoOutput;
		staff: TournamentStaffRole[];
	};
	export let form: TournamentEditActionResult | undefined;

	const editTabs = [
		'info',
		'participants',
		'staff',
		'stages',
		'schedule',
		'lobbies',
		'mappools'
	] as const;
	type EditTab = (typeof editTabs)[number];
	let activeTab: EditTab = 'info';
	let lastTabParam: string | null = null;

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
		if (value === 'tournament') {
			return 'info';
		}

		return isEditTab(value) ? value : 'info';
	}

	function getViewHref(tab: EditTab) {
		const params = new URLSearchParams($page.url.searchParams);
		const viewTab = tab === 'schedule' || tab === 'lobbies' || tab === 'mappools' ? tab : 'info';
		params.set('tab', viewTab);

		if (viewTab !== 'schedule' && viewTab !== 'lobbies' && viewTab !== 'mappools') {
			params.delete('stage');
		}

		const query = params.toString();
		return `/events/${data.tournament.id}${query ? `?${query}` : ''}`;
	}

	function setActiveTab(value: string) {
		if (isEditTab(value)) {
			activeTab = value;
		}
	}

	$: {
		const tabParam = $page.url.searchParams.get('tab');

		if (tabParam !== lastTabParam) {
			lastTabParam = tabParam;
			activeTab = getActiveEditTab(tabParam);
		}
	}
	$: viewHref = getViewHref(activeTab);
</script>

<svelte:head>
	<title>CTE - Edit {data.tournament.name}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<TabGroup value={activeTab} onValueChange={setActiveTab} let:Head let:ContentItem>
		<div class="mb-4 flex items-start justify-between">
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				<Item value="info" href={getEditTabHref('info')}>Info</Item>
				<Item value="participants" href={getEditTabHref('participants')}>Participants</Item>
				<Item value="staff" href={getEditTabHref('staff')}>Staff</Item>
				<Item value="stages" href={getEditTabHref('stages')}>Stages</Item>
				<Item value="schedule" href={getEditTabHref('schedule')}>Schedule</Item>
				<Item value="lobbies" href={getEditTabHref('lobbies')}>Lobbies</Item>
				<Item value="mappools" href={getEditTabHref('mappools')}>Mappools</Item>
			</Head>

			<a href={viewHref}>
				<Button class="w-[120px] text-[12px]" variant="outline">View</Button>
			</a>
		</div>

		<ContentItem value="info">
			<TournamentTab tournament={data.tournament} {form} />
		</ContentItem>

		<ContentItem value="participants">
			<ParticipantsTab roster={data.qualificationRoster} {form} />
		</ContentItem>
		<ContentItem value="staff"><StaffTab staff={data.staff} {form} /></ContentItem>

		<ContentItem value="stages">
			<StagesTab tournament={data.tournament} stages={data.stages} {form} />
		</ContentItem>

		<ContentItem value="schedule">
			<ScheduleTab
				tournamentId={data.tournament.id}
				stages={data.stages}
				schedule={data.schedule}
				isTeam={data.tournament.isTeam}
				{form}
			/>
		</ContentItem>
		<ContentItem value="lobbies"
			><QualificationLobbiesTab
				stages={data.stages}
				lobbies={data.qualificationLobbies}
				staff={data.staff}
			/></ContentItem
		>

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
