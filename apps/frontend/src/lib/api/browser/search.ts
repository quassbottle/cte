import type { SearchOption } from '$lib/components/SearchCombobox.svelte';

const get = async (url: string, signal: AbortSignal): Promise<SearchOption[]> => {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(await response.text());
	return response.json();
};

export const searchUsers = async (query: string, signal: AbortSignal): Promise<SearchOption[]> => {
	if (!query.trim()) return [];

	const response = await fetch(`/api/users/lookup?${new URLSearchParams({ query })}`, { signal });
	if (response.status === 404) return [];
	if (!response.ok) throw new Error(await response.text());
	const user = await response.json();
	return [{ id: user.id, label: user.osuUsername, avatarUrl: user.avatarUrl }];
};

export const searchTournamentTeams =
	(tournamentId: string) => (query: string, signal: AbortSignal) =>
		get(
			`/api/tournaments/${tournamentId}/competitors?${new URLSearchParams({ type: 'team', query })}`,
			signal
		);

export const searchTournamentPlayers =
	(tournamentId: string) => (query: string, signal: AbortSignal) =>
		get(
			`/api/tournaments/${tournamentId}/competitors?${new URLSearchParams({ type: 'player', query })}`,
			signal
		);
