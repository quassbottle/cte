<script lang="ts">
	import Beatmap from '$lib/components/beatmap/beatmap.svelte';
	import type { OsuBeatmapMetadata } from '$lib/schemas/osu.schema';
	import type { OsuMode } from '$lib/api/types';

	export let metadata: OsuBeatmapMetadata;
	export let mod: string;
	export let index: number;
	export let tournamentMode: OsuMode;
</script>

<div class="flex w-full max-w-xl flex-col gap-2">
	<p class="text-xs text-muted-foreground">Preview of map to add (slot {mod}{index})</p>
	<Beatmap
		artist={metadata.artist}
		title={metadata.title}
		difficultyName={metadata.difficultyName}
		beatmapsetId={metadata.osuBeatmapsetId}
		beatmapId={metadata.osuBeatmapId}
		{mod}
		{tournamentMode}
		{index}
		difficulty={metadata.difficulty}
		deleted={metadata.deleted}
	/>
</div>
