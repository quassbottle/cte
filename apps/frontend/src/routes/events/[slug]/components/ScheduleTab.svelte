<script lang="ts">
	import type { StageDto } from '$lib/api/types';

	export let stages: StageDto[];

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
</script>

<div class="flex flex-col gap-3">
	{#each sortedStages as stage}
		<div class="border-border rounded-md border px-3 py-2">
			<p class="text-sm font-medium">{stage.name}</p>
			<p class="text-xs text-muted-foreground">
				{new Date(stage.startsAt).toLocaleString()} - {new Date(stage.endsAt).toLocaleString()}
			</p>
		</div>
	{:else}
		<p>No stages added yet.</p>
	{/each}
</div>
