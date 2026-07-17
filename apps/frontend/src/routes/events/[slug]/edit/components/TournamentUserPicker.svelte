<script lang="ts">
	import { searchTournamentPlayers, searchUsers } from '$lib/api/browser/search';
	import SearchCombobox, { type SearchOption } from '$lib/components/SearchCombobox.svelte';

	export let label: string;
	export let name: string;
	export let placeholder: string;
	export let tournamentId: string | undefined = undefined;
	export let initial: SearchOption | undefined = undefined;
	export let selectedId: string | undefined = initial?.id;
	$: search = tournamentId ? searchTournamentPlayers(tournamentId) : searchUsers;
</script>

<SearchCombobox {label} {name} {placeholder} {search} {initial} bind:selectedId />
