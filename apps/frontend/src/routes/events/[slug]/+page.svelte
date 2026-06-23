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
	import type { Viewer } from '$lib/types/viewer';
	import { Button } from '$lib/components/ui/button';
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
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
		canEditTournament: boolean;
	};
	export let form: TournamentRegistrationForm;

	let activeTab = 'info';
</script>

<TabGroup bind:value={activeTab} let:Head let:ContentItem>
	<div class="mb-4 flex items-start justify-between">
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			<Item value="info">Info</Item>
			<Item value="participants">Participants</Item>
			<Item value="schedule">Schedule</Item>
			<Item value="mappools">Mappools</Item>
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
		<ParticipantsTab tournament={data.tournament} participants={data.participants} teams={data.teams} />
	</ContentItem>

	<ContentItem value="schedule">
		<ScheduleTab stages={data.stages} />
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
