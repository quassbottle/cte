<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, OsuMode, StageDto } from '$lib/api/types';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import AddBeatmapForm from './AddBeatmapForm.svelte';
	import CreateMappoolForm from './CreateMappoolForm.svelte';
	import MappoolCard from './MappoolCard.svelte';

	export let stage: StageDto;
	export let mappool: MappoolDto | undefined;
	export let beatmaps: MappoolBeatmapDto[];
	export let tournamentMode: OsuMode;
	export let result: TournamentEditActionResult | undefined;
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3">
		<p class="text-sm font-medium">Mappools in {stage.name}</p>
		{#if mappool}
			<MappoolCard {mappool} {beatmaps} {tournamentMode} {result} />
		{:else}
			<p class="text-sm text-muted-foreground">No mappools for this stage yet.</p>
		{/if}
	</div>

	<CreateMappoolForm {stage} hasMappool={Boolean(mappool)} {result} />

	{#if mappool}
		<AddBeatmapForm {mappool} {beatmaps} {tournamentMode} {result} />
	{/if}
</div>
