<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import type {
		QualificationLobbyDtoOutput,
		TournamentStaffRoleDto
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import QualificationLobbyTable from '$lib/components/qualificationLobby/QualificationLobbyTable.svelte';
	import { findQualificationLobby } from '$lib/components/qualificationLobby/qualificationLobby-view';
	import { Button } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { Pencil } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import QualificationLobbyEditDialog from './QualificationLobbyEditDialog.svelte';

	export let stageId: string;
	export let lobbies: QualificationLobbyDtoOutput[];
	export let staff: TournamentStaffRoleDto[];
	export let beatmaps: MappoolBeatmapDto[];
	export let isTeam: boolean;
	export let form: TournamentEditActionResult | undefined;

	let selectedLobbyId: string | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	$: stageLobbies = lobbies.filter((lobby) => lobby.stageId === stageId);
	$: selectedLobby = findQualificationLobby(lobbies, selectedLobbyId);
	$: hasActiveSync = stageLobbies.some((lobby) => lobby.syncStatus === 'active');
	$: {
		if (browser && hasActiveSync && !timer) timer = setInterval(() => void invalidateAll(), 10_000);
		if (browser && !hasActiveSync && timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	onDestroy(() => timer && clearInterval(timer));
</script>

<QualificationLobbyTable lobbies={stageLobbies} {beatmaps} {isTeam} canEdit>
	<Button
		slot="actions"
		let:lobby
		type="button"
		variant="outline"
		size="sm"
		class="gap-1"
		on:click={() => (selectedLobbyId = lobby.id)}
	>
		<Pencil class="h-3 w-3" />
		Edit
	</Button>
</QualificationLobbyTable>

{#if selectedLobby}
	<QualificationLobbyEditDialog
		lobby={selectedLobby}
		{staff}
		{form}
		onClose={() => (selectedLobbyId = null)}
	/>
{/if}
