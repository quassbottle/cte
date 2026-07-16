<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, UserDto } from '$lib/api/types';
	import type { TournamentStaffRoleDto } from '$lib/api/generated/model';
	import type { Viewer } from '$lib/types/viewer';
	import TournamentBanner from '$lib/components/tournamentBanner/tournamentBanner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import { gamemodes } from '$lib/utils/types';
	import { pluralize } from '$lib/utils/text';
	import { Calendar, UserRound } from 'lucide-svelte';
	import RegistrationControls from './RegistrationControls.svelte';
	import type { TournamentRegistrationForm } from './types';

	export let tournament: TournamentDto;
	export let user: Viewer | null;
	export let participants: TournamentParticipantDto[];
	export let host: UserDto;
	export let form: TournamentRegistrationForm | undefined;
	export let staff: TournamentStaffRoleDto[];

	$: participantsCount = tournament.participantsCount ?? participants.length;
</script>

<div class="relative">
	<TournamentBanner
		class="relative h-[260px] text-white"
		let:Content
		seed={tournament.id}
		mode={tournament.mode}
	>
		<Content class="absolute bottom-0 left-0 flex w-full flex-col p-5 sm:w-[60%] sm:p-6">
			<p class="text-[28px] font-semibold leading-tight sm:text-[32px]">{tournament.name}</p>
			<div class="hidden sm:block">
				<BreadcrumbList let:Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<Calendar class="h-3 w-3" />
							{new Date(tournament.startsAt).toDateString()}
						</div>
					</Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<UserRound class="h-3 w-3" />
							<span>{participantsCount} {pluralize('participant', participantsCount)}</span>
						</div>
					</Item>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<GameModeIcon class="h-3 w-3 invert" gamemode={tournament.mode} />
							{gamemodes.find((item) => item.value === tournament.mode)?.label ?? tournament.mode}
						</div>
					</Item>
					<Item>
						<p class="select-none gap-1 text-[12px]">
							{tournament.isTeam ? 'Team tournament' : 'Solo tournament'}
						</p>
					</Item>
					<Item>
						<p class="select-none gap-1 text-[12px]">
							Hosted by <a href="/users/{host.id}">{host.osuUsername}</a>
						</p>
					</Item>
				</BreadcrumbList>
			</div>

			<RegistrationControls {tournament} {user} {participants} {form} {staff} />
		</Content>
	</TournamentBanner>

	<div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground sm:hidden">
		<div class="flex select-none flex-row items-center gap-1">
			<Calendar class="h-3 w-3" />
			{new Date(tournament.startsAt).toDateString()}
		</div>
		<div class="flex select-none flex-row items-center gap-1">
			<UserRound class="h-3 w-3" />
			<span>{participantsCount} {pluralize('participant', participantsCount)}</span>
		</div>
		<div class="flex select-none flex-row items-center gap-1">
			<GameModeIcon class="h-3 w-3" gamemode={tournament.mode} />
			{gamemodes.find((item) => item.value === tournament.mode)?.label ?? tournament.mode}
		</div>
		<p class="select-none">{tournament.isTeam ? 'Team tournament' : 'Solo tournament'}</p>
		<p class="select-none">
			Hosted by <a class="text-foreground hover:underline" href="/users/{host.id}"
				>{host.osuUsername}</a
			>
		</p>
	</div>
</div>
