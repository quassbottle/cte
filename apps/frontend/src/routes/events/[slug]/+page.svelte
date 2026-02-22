<script lang="ts">
	import type {
		MappoolBeatmapDto,
		MappoolDto,
		StageDto,
		TournamentDto,
		TournamentParticipantDto,
		TournamentTeamDto,
		UserDto,
		UserSession
	} from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import InfoTab from './components/InfoTab.svelte';
	import ParticipantsTab from './components/ParticipantsTab.svelte';
	import ScheduleTab from './components/ScheduleTab.svelte';
	import MappoolsTab from './components/MappoolsTab.svelte';

	export let data: {
		tournament: TournamentDto;
		session?: UserSession;
		participants: TournamentParticipantDto[];
		teams: TournamentTeamDto[];
		host: UserDto;
		stages: StageDto[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
		canEditTournament: boolean;
	};
	export let form:
		| {
				registrationError?: string;
				teamName?: string;
				teamParticipantIds?: string;
		  }
		| undefined;
</script>

<TabGroup let:Head let:ContentItem>
	<div class="mb-4 flex items-start justify-between">
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			<Item>Info</Item>
			<Item>Participants</Item>
			<Item>Schedule</Item>
			<Item>Mappools</Item>
		</Head>

		{#if data.canEditTournament}
			<a href="/events/{data.tournament.id}/edit">
				<Button class="w-[120px] text-[12px]">Edit</Button>
			</a>
		{/if}
	</div>

	<ContentItem>
		<InfoTab
			tournament={data.tournament}
			session={data.session}
			participants={data.participants}
			host={data.host}
			{form}
		/>
	</ContentItem>

	<ContentItem>
		<ParticipantsTab tournament={data.tournament} participants={data.participants} teams={data.teams} />
	</ContentItem>

	<ContentItem>
		<ScheduleTab stages={data.stages} />
	</ContentItem>

	<ContentItem>
		<MappoolsTab
			stages={data.stages}
			mappools={data.mappools}
			mappoolBeatmaps={data.mappoolBeatmaps}
		/>
	</ContentItem>
</TabGroup>
