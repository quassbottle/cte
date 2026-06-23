<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, UserDto } from '$lib/api/types';
	import type { Viewer } from '$lib/types/viewer';
	import Banner from '$lib/components/banner/banner.svelte';
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

	$: participantsCount = tournament.participantsCount ?? participants.length;
</script>

<div class="relative">
	<Banner
		class="relative h-[260px] text-white"
		let:Content
		src={'https://assets.ppy.sh/beatmaps/2315685/covers/cover@2x.jpg'}
	>
		<Content class="absolute bottom-0 left-0 flex w-[60%] flex-col p-6">
			<p class="text-[32px] font-semibold">{tournament.name}</p>
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

			<RegistrationControls {tournament} {user} {participants} {form} />
		</Content>
	</Banner>
</div>
