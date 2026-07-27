<script lang="ts">
	import Mod from '$lib/components/mod/mod.svelte';
	import Rank from '$lib/components/rank/rank.svelte';
	import {
		formatMultiplayerAccuracy,
		formatMultiplayerScore,
		requireMultiplayerScoreDetails,
		type PlayerMultiplayerScoreData
	} from './multiplayerScore';

	const { score }: { score: PlayerMultiplayerScoreData } = $props();
	const completeScore = $derived(requireMultiplayerScoreDetails(score));
	const displayName = $derived(completeScore.userName ?? `osu! ${completeScore.osuUserId}`);
	const formattedAccuracy = $derived(formatMultiplayerAccuracy(completeScore.accuracy));
</script>

<article
	class="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-center"
>
	<div class="flex min-w-0 items-center gap-3">
		<img
			class="h-11 w-11 shrink-0 rounded-full bg-muted object-cover"
			src={`https://a.ppy.sh/${completeScore.osuUserId}`}
			alt={`${displayName} avatar`}
		/>
		<p class="min-w-0 truncate font-semibold">{displayName}</p>
		{#each completeScore.mods as mod}
			<Mod {mod} class="w-auto shrink-0 px-2 text-xs" />
		{/each}
	</div>

	<div class="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
		<p class="text-xs text-muted-foreground">
			Combo <strong class="text-foreground">{formatMultiplayerScore(completeScore.maxCombo)}</strong>
		</p>
		<p class="text-xs text-muted-foreground">
			Accuracy <strong class="text-foreground">{formattedAccuracy}</strong>
		</p>
		<div class="text-right">
			<p class="text-xs text-muted-foreground">
				Score <strong class="text-xl text-primary">{formatMultiplayerScore(completeScore.score)}</strong>
			</p>
			{#if score.great !== null || score.ok !== null || score.miss !== null}
				<p class="flex gap-3 text-[11px] text-muted-foreground">
					{#if score.great !== null}<span>Great {formatMultiplayerScore(score.great)}</span>{/if}
					{#if score.ok !== null}<span>Ok {formatMultiplayerScore(score.ok)}</span>{/if}
					{#if score.miss !== null}<span>Miss {formatMultiplayerScore(score.miss)}</span>{/if}
				</p>
			{/if}
		</div>
		<Rank rank={completeScore.rank} />
	</div>
</article>
