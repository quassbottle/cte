<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import StaffList from '$lib/components/match/StaffList.svelte';
	import MultiplayerHistory from '$lib/components/multiplayerHistory/MultiplayerHistory.svelte';
	import type { MultiplayerHistoryData } from '$lib/components/multiplayerHistory/multiplayerHistory';
	import { getLobbySeats, toRefereeView } from './qualificationLobby-view';

	export let lobby: QualificationLobbyDtoOutput;
	export let history: MultiplayerHistoryData | null = null;
	export let loading = false;
	export let historyError: string | null = null;
</script>

<article class="flex flex-col gap-3 rounded-md border border-border p-4">
	<header class="flex items-start justify-between gap-3 pr-12">
		<div>
			<h3 class="font-semibold">Lobby {lobby.number}</h3>
			<p class="text-xs text-muted-foreground">
				{new Date(lobby.startsAt).toLocaleString()}–{new Date(lobby.endsAt).toLocaleTimeString()}
			</p>
			<StaffList staff={[toRefereeView(lobby.referee)]} />
		</div>
		<span class="rounded bg-muted px-2 py-1 text-xs font-medium">
			{lobby.syncStatus ?? 'not linked'}
		</span>
	</header>

	<p class="text-sm">{getLobbySeats(lobby.seatCount)}</p>
	{#if lobby.players.length}<p class="text-sm">
			{lobby.players.map(({ name }) => name).join(', ')}
		</p>{/if}
	{#if lobby.teams.length}<p class="text-sm">
			{lobby.teams.map(({ name }) => name).join(', ')}
		</p>{/if}
	{#if lobby.mpUrl}<a class="text-sm underline" href={lobby.mpUrl}>Multiplayer room</a>{/if}
	{#if lobby.lastSyncedAt}
		<p class="text-xs text-muted-foreground">
			Synced {new Date(lobby.lastSyncedAt).toLocaleString()}
		</p>
	{/if}

	{#if loading}
		<p class="py-8 text-center text-sm text-muted-foreground">Loading history…</p>
	{:else if historyError}
		<p class="py-8 text-center text-sm text-destructive">{historyError}</p>
	{:else if history}
		<MultiplayerHistory {history} />
	{/if}

	<slot name="actions" />
</article>
