<script lang="ts">
	import type {
		MappoolBeatmapDto,
		MappoolDto,
		StageDto,
		TournamentDto,
		TournamentParticipantDto,
		TournamentTeamDto,
		UserDto
	} from '$lib/api/types';
	import type { StageScheduleDtoOutput } from '$lib/api/generated/model';
	import type { Viewer } from '$lib/types/viewer';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import InfoTab from './components/InfoTab.svelte';
	import ParticipantsTab from './components/ParticipantsTab.svelte';
	import ScheduleTab from './components/ScheduleTab.svelte';
	import MappoolsTab from './components/MappoolsTab.svelte';
	import type { TournamentRegistrationForm } from './components/info/types';

	export let data: {
		tournament: TournamentDto;
		user: Viewer | null;
		participants: TournamentParticipantDto[];
		teams: TournamentTeamDto[];
		host: UserDto;
		stages: StageDto[];
		schedule: StageScheduleDtoOutput[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
		canEditTournament: boolean;
	};
	export let form: TournamentRegistrationForm;

	const tournamentTabs = ['info', 'participants', 'schedule', 'mappools'] as const;
	type TournamentTab = (typeof tournamentTabs)[number];

	function isTournamentTab(value: string | null): value is TournamentTab {
		return tournamentTabs.some((tab) => tab === value);
	}

	function getTournamentTabHref(tab: TournamentTab) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', tab);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}

	function getActiveTournamentTab(value: string | null): TournamentTab {
		return isTournamentTab(value) ? value : 'info';
	}

	$: activeTab = getActiveTournamentTab($page.url.searchParams.get('tab'));
</script>

<svelte:head>
	<title>CTE - {data.tournament.name}</title>
</svelte:head>

<TabGroup value={activeTab} let:Head let:ContentItem>
	<div class="mb-4 flex items-start justify-between">
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			<Item value="info" href={getTournamentTabHref('info')}>Info</Item>
			<Item value="participants" href={getTournamentTabHref('participants')}>Participants</Item>
			<Item value="schedule" href={getTournamentTabHref('schedule')}>Schedule</Item>
			<Item value="mappools" href={getTournamentTabHref('mappools')}>Mappools</Item>
		</Head>

		{#if data.canEditTournament}
			<a href="/events/{data.tournament.id}/edit">
				<Button class="w-[120px] text-[12px]">Edit</Button>
			</a>
		{/if}
	</div>

	<ContentItem value="info">
		<InfoTab
			tournament={data.tournament}
			user={data.user}
			participants={data.participants}
			host={data.host}
			{form}
		/>
	</ContentItem>

	<ContentItem value="participants">
		<ParticipantsTab
			tournament={data.tournament}
			participants={data.participants}
			teams={data.teams}
		/>
	</ContentItem>

	<ContentItem value="schedule">
		<ScheduleTab schedule={data.schedule} />
	</ContentItem>

	<ContentItem value="mappools">
		<MappoolsTab
			tournamentMode={data.tournament.mode}
			stages={data.stages}
			mappools={data.mappools}
			mappoolBeatmaps={data.mappoolBeatmaps}
		/>
	</ContentItem>
</TabGroup>
