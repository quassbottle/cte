<script lang="ts">
	import { searchTournamentTeams } from '$lib/api/browser/search';
	import SearchCombobox, { type SearchOption } from '$lib/components/SearchCombobox.svelte';

	export let label: string;
	export let name: string;
	export let placeholder: string;
	export let tournamentId: string;
	export let initial: SearchOption | undefined = undefined;
</script>

<SearchCombobox
	{label}
	{name}
	{placeholder}
	search={searchTournamentTeams(tournamentId)}
	{initial}
/>
