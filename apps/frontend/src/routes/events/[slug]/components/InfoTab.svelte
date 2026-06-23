<script lang="ts">
	import type { TournamentDto, TournamentParticipantDto, UserDto } from '$lib/api/types';
	import type { Viewer } from '$lib/types/viewer';
	import DescriptionSection from './info/DescriptionSection.svelte';
	import RulesSection from './info/RulesSection.svelte';
	import TournamentHero from './info/TournamentHero.svelte';
	import type { TournamentRegistrationForm } from './info/types';

	export let tournament: TournamentDto;
	export let user: Viewer | null;
	export let participants: TournamentParticipantDto[];
	export let host: UserDto;
	export let form: TournamentRegistrationForm;
</script>

<div class="flex flex-col gap-8">
	<TournamentHero {tournament} {user} {participants} {host} {form} />
	<DescriptionSection value={tournament.description} />
	<RulesSection value={tournament.rules} />
</div>
