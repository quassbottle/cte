<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import type { MappoolBeatmapDto } from '$lib/api/types';
	import QualificationLobbyCard from './qualificationLobby.svelte';
	import MultiplayerHistoryDialog from '$lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte';

	export let lobby: QualificationLobbyDtoOutput;
	export let beatmaps: MappoolBeatmapDto[];
	export let onClose: () => void;
</script>

<MultiplayerHistoryDialog {onClose}>
	<QualificationLobbyCard {lobby} {beatmaps} />
</MultiplayerHistoryDialog>
