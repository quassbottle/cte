<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import MatchLink from '$lib/components/match/MatchLink.svelte';
	import ScheduleTable from '$lib/components/schedule/ScheduleTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import QualificationLobbyDetailDialog from './QualificationLobbyDetailDialog.svelte';

	export let lobbies: QualificationLobbyDtoOutput[];
	export let isTeam: boolean;

	let selectedLobby: QualificationLobbyDtoOutput | null = null;

	const registeredNames = (lobby: QualificationLobbyDtoOutput) =>
		(isTeam ? lobby.teams : lobby.players).map(({ name }) => name).join(', ') || '—';
	const formatTime = (value: string) =>
		new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<ScheduleTable>
	<svelte:fragment slot="header">
		<thead class="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
			<tr>
				<th class="w-16 px-4 py-3 font-semibold">ID</th>
				<th class="w-40 px-4 py-3 font-semibold">Time</th>
				<th class="px-4 py-3 font-semibold">{isTeam ? 'Teams' : 'Players'}</th>
				<th class="w-48 px-4 py-3 font-semibold">Referee</th>
				<th class="w-24 px-4 py-3 font-semibold">Status</th>
				<th class="w-16 px-4 py-3 text-center font-semibold">MP</th>
				<th class="w-52 px-4 py-3 text-right font-semibold">Actions</th>
			</tr>
		</thead>
	</svelte:fragment>
	<svelte:fragment slot="rows">
		<tbody>
			{#each lobbies as lobby (lobby.id)}
				<tr class="border-t border-border">
					<td class="px-4 py-4 font-medium text-muted-foreground">{lobby.number}</td>
					<td class="px-4 py-4">
						<p class="font-semibold">{new Date(lobby.startsAt).toLocaleDateString()}</p>
						<p class="text-xs text-muted-foreground">
							{formatTime(lobby.startsAt)}–{formatTime(lobby.endsAt)}
						</p>
					</td>
					<td class="px-4 py-4 font-medium">{registeredNames(lobby)}</td>
					<td class="px-4 py-4">{lobby.refereeName}</td>
					<td class="px-4 py-4">
						<span class="rounded bg-muted px-2 py-1 text-xs font-medium">
							{lobby.syncStatus ?? 'not linked'}
						</span>
					</td>
					<td class="px-4 py-4 text-center"><MatchLink href={lobby.mpUrl ?? null} type="mp" /></td>
					<td class="px-4 py-4">
						<div class="flex justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								on:click={() => (selectedLobby = lobby)}
							>
								Open
							</Button>
							<slot name="actions" {lobby} />
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</svelte:fragment>
	<svelte:fragment slot="mobile">
		{#each lobbies as lobby (lobby.id)}
			<article class="flex flex-col gap-3 p-4">
				<header class="flex items-start justify-between gap-3">
					<div>
						<p class="font-semibold">Lobby {lobby.number}</p>
						<p class="text-xs text-muted-foreground">
							{new Date(lobby.startsAt).toLocaleDateString()} · {formatTime(
								lobby.startsAt
							)}–{formatTime(lobby.endsAt)}
						</p>
					</div>
					<span class="rounded bg-muted px-2 py-1 text-xs font-medium">
						{lobby.syncStatus ?? 'not linked'}
					</span>
				</header>
				<p class="text-sm">
					<span class="text-muted-foreground">{isTeam ? 'Teams' : 'Players'}:</span>
					{registeredNames(lobby)}
				</p>
				<p class="text-sm">
					<span class="text-muted-foreground">Referee:</span>
					{lobby.refereeName}
				</p>
				<div class="flex items-center justify-between gap-2">
					<MatchLink href={lobby.mpUrl ?? null} type="mp" />
					<div class="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							on:click={() => (selectedLobby = lobby)}
						>
							Open
						</Button>
						<slot name="actions" {lobby} />
					</div>
				</div>
			</article>
		{/each}
	</svelte:fragment>
</ScheduleTable>

{#if selectedLobby}
	<QualificationLobbyDetailDialog lobby={selectedLobby} onClose={() => (selectedLobby = null)} />
{/if}
