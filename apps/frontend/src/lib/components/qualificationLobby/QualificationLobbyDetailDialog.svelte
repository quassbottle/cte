<script lang="ts">
	import type {
		QualificationLobbyDtoOutput,
		QualificationLobbyHistoryDtoOutput
	} from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import {
		toQualificationHistory,
		type MultiplayerHistoryData,
		type MultiplayerHistoryTarget
	} from '$lib/components/multiplayerHistory/multiplayerHistory';
	import QualificationLobbyCard from './qualificationLobby.svelte';
	import MultiplayerHistoryDialog from '$lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte';
	import { onMount } from 'svelte';

	export let tournamentId: string;
	export let lobby: QualificationLobbyDtoOutput;
	export let beatmaps: MappoolBeatmapDto[];
	export let onClose: () => void;
	export let target: MultiplayerHistoryTarget | null = null;

	let history: MultiplayerHistoryData | null = null;
	let loading = true;
	let historyError: string | null = null;
	const request = new AbortController();

	async function loadHistory() {
		try {
			const response = await fetch(
				`/api/tournaments/${tournamentId}/qualification-lobbies/${lobby.id}/history`,
				{ signal: request.signal }
			);
			if (!response.ok) throw new Error('Unable to load qualification history');
			history = toQualificationHistory(
				(await response.json()) as QualificationLobbyHistoryDtoOutput,
				beatmaps
			);
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				historyError =
					error instanceof Error ? error.message : 'Unable to load qualification history';
			}
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadHistory();
		return () => request.abort();
	});

	function close() {
		request.abort();
		onClose();
	}
</script>

<MultiplayerHistoryDialog onClose={close}>
	<QualificationLobbyCard {lobby} {history} {loading} {historyError} {target} />
</MultiplayerHistoryDialog>
