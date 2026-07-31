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
	import type {
		QualificationLobbyDtoOutput,
		StageStatisticsDtoOutput,
		StageScheduleDtoOutput,
		TournamentStaffRoleDto
	} from '$lib/api/generated/model';
	import type { Viewer } from '$lib/types/viewer';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import InfoTab from './components/InfoTab.svelte';
	import ParticipantsTab from './components/ParticipantsTab.svelte';
	import ScheduleTab from './components/ScheduleTab.svelte';
	import MappoolsTab from './components/MappoolsTab.svelte';
	import StaffTab from './components/StaffTab.svelte';
	import StatisticsTab from './components/StatisticsTab.svelte';
	import type { TournamentRegistrationForm } from './components/info/types';
	import { X } from 'lucide-svelte';

	export let data: {
		tournament: TournamentDto;
		user: Viewer | null;
		participants: TournamentParticipantDto[];
		teams: TournamentTeamDto[];
		staff: TournamentStaffRoleDto[];
		host: UserDto;
		stages: StageDto[];
		schedule: StageScheduleDtoOutput[];
		qualificationLobbies: QualificationLobbyDtoOutput[];
		stageStatistics: StageStatisticsDtoOutput | null;
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
		canEditTournament: boolean;
		canDeleteTournament: boolean;
	};
	export let form: TournamentRegistrationForm;

	const tournamentTabs = [
		'info',
		'participants',
		'staff',
		'schedule',
		'mappools',
		'statistics'
	] as const;
	type TournamentTab = (typeof tournamentTabs)[number];
	let activeTab: TournamentTab = 'info';
	let lastTabParam: string | null = null;
	let isDeleteDialogOpen = Boolean(form?.deleteError);

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
		if (!isTournamentTab(value)) return 'info';
		if (value === 'statistics' && !data.stageStatistics) return 'info';
		return value;
	}

	function getEditHref(tab: TournamentTab) {
		const params = new URLSearchParams($page.url.searchParams);
		const editTab = tab === 'schedule' || tab === 'mappools' ? tab : 'info';
		params.set('tab', editTab);

		if (editTab !== 'schedule' && editTab !== 'mappools') {
			params.delete('stage');
		}

		const query = params.toString();
		return `/events/${data.tournament.id}/edit${query ? `?${query}` : ''}`;
	}

	function setActiveTab(value: string) {
		activeTab = getActiveTournamentTab(value);
	}

	$: {
		const tabParam = $page.url.searchParams.get('tab');

		if (tabParam !== lastTabParam) {
			lastTabParam = tabParam;
			activeTab = getActiveTournamentTab(tabParam);
		}
	}
	$: editHref = getEditHref(activeTab);
</script>

<svelte:head>
	<title>CTE - {data.tournament.name}</title>
</svelte:head>

<TabGroup value={activeTab} onValueChange={setActiveTab} let:Head let:ContentItem>
	<div class="mb-4 flex items-start justify-between">
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			<Item value="info" href={getTournamentTabHref('info')}>Info</Item>
			<Item value="participants" href={getTournamentTabHref('participants')}>Participants</Item>
			<Item value="staff" href={getTournamentTabHref('staff')}>Staff</Item>
			<Item value="schedule" href={getTournamentTabHref('schedule')}>Schedule</Item>
			<Item value="mappools" href={getTournamentTabHref('mappools')}>Mappools</Item>
			{#if data.stages.length}
				<Item value="statistics" href={getTournamentTabHref('statistics')}>Statistics</Item>
			{/if}
		</Head>

		<div class="flex gap-2">
			{#if data.canEditTournament}
				<a href={editHref}>
					<Button class="w-[120px] text-[12px]">Edit</Button>
				</a>
			{/if}
			{#if data.canDeleteTournament}
				<Button
					class="text-[12px]"
					variant="destructive"
					on:click={() => (isDeleteDialogOpen = true)}
				>
					Delete tournament
				</Button>
			{/if}
		</div>
	</div>

	<ContentItem value="info">
		<InfoTab
			tournament={data.tournament}
			user={data.user}
			participants={data.participants}
			host={data.host}
			{form}
			staff={data.staff}
		/>
	</ContentItem>

	<ContentItem value="participants">
		<ParticipantsTab
			tournament={data.tournament}
			participants={data.participants}
			teams={data.teams}
		/>
	</ContentItem>

	<ContentItem value="staff"><StaffTab staff={data.staff} /></ContentItem>

	<ContentItem value="schedule">
		<ScheduleTab
			tournamentId={data.tournament.id}
			schedule={data.schedule}
			lobbies={data.qualificationLobbies}
			beatmaps={data.mappoolBeatmaps.flatMap(({ beatmaps }) => beatmaps)}
			user={data.user}
			teams={data.teams}
			isTeam={data.tournament.isTeam}
		/>
	</ContentItem>

	<ContentItem value="mappools">
		<MappoolsTab
			tournamentMode={data.tournament.mode}
			stages={data.stages}
			mappools={data.mappools}
			mappoolBeatmaps={data.mappoolBeatmaps}
		/>
	</ContentItem>

	{#if data.stageStatistics}
		<ContentItem value="statistics">
			<StatisticsTab
				tournamentId={data.tournament.id}
				statistics={data.stageStatistics}
				stages={data.stages}
				schedule={data.schedule}
				lobbies={data.qualificationLobbies}
				beatmaps={data.mappoolBeatmaps.flatMap(({ beatmaps }) => beatmaps)}
				isTeam={data.tournament.isTeam}
			/>
		</ContentItem>
	{/if}
</TabGroup>

{#if isDeleteDialogOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={(event) => {
			if (event.target === event.currentTarget) isDeleteDialogOpen = false;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') isDeleteDialogOpen = false;
		}}
	>
		<div
			class="w-full max-w-md rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-xl font-semibold">Delete tournament</p>
					<p class="text-sm text-muted-foreground">This action cannot be undone.</p>
				</div>
				<Button variant="ghost" size="icon" on:click={() => (isDeleteDialogOpen = false)}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			{#if form?.deleteError}
				<p class="mb-3 text-sm text-destructive">{form.deleteError}</p>
			{/if}

			<div class="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					class="text-[12px]"
					on:click={() => (isDeleteDialogOpen = false)}>Cancel</Button
				>
				<form method="post" action="?/deleteTournament">
					<Button type="submit" variant="destructive" class="text-[12px]">
						Delete tournament
					</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
