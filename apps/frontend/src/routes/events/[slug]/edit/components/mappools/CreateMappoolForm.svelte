<script lang="ts">
	import { enhance } from '$app/forms';
	import type { StageDto } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let stage: StageDto;
	export let hasMappool: boolean;
	export let result: TournamentEditActionResult | undefined;
	export let onSuccess: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	$: createError =
		result?.action === 'createMappool' && !result.ok && result.stageId === stage.id
			? result
			: undefined;

	const enhanceCreateMappool: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });

			if (result.type === 'success') {
				onSuccess?.();
			}
		};
	};
</script>

<form
	method="post"
	action="?/createMappool"
	class="flex flex-col gap-3"
	use:enhance={enhanceCreateMappool}
>
	<p class="text-sm font-medium">Create mappool</p>
	<input type="hidden" name="stageId" value={stage.id} />
	{#if hasMappool}
		<p class="text-xs text-muted-foreground">
			This stage already has a mappool. Only one mappool per stage is allowed.
		</p>
	{/if}
	<div class="flex flex-col gap-4 md:flex-row">
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for={`mappool-starts-at-${stage.id}`}>Starts at</Label>
			<Input
				id={`mappool-starts-at-${stage.id}`}
				name="startsAt"
				type="datetime-local"
				required
				value={toDateTimeLocalValue(stage.startsAt)}
			/>
		</div>
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for={`mappool-ends-at-${stage.id}`}>Ends at</Label>
			<Input
				id={`mappool-ends-at-${stage.id}`}
				name="endsAt"
				type="datetime-local"
				required
				value={toDateTimeLocalValue(stage.endsAt)}
			/>
		</div>
	</div>
	{#if createError}
		<p class="text-sm text-destructive">{createError.message}</p>
	{/if}
	<div>
		<Button
			class="w-[160px] bg-accept text-[12px]"
			variant="accept"
			type="submit"
			disabled={hasMappool}
		>
			Add mappool
		</Button>
		{#if onCancel}
			<Button type="button" variant="outline" class="ml-2 text-[12px]" on:click={onCancel}>
				Cancel
			</Button>
		{/if}
	</div>
</form>
