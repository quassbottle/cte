<script lang="ts">
	import { enhance } from '$app/forms';
	import type { StageDto, TournamentDto } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Pencil, Plus, Trash2, X } from 'lucide-svelte';

	export let tournament: TournamentDto;
	export let stages: StageDto[];
	export let form:
		| {
				action?: string;
				message?: string;
				stageId?: string;
		  }
		| undefined;

	let dialog:
		| {
				mode: 'create';
		  }
		| {
				mode: 'update';
				stage: StageDto;
		  }
		| {
				mode: 'delete';
				stage: StageDto;
		  }
		| null = null;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	const formatStageDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));

	const enhanceStageSubmit: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });

			if (result.type === 'success') {
				dialog = null;
			}
		};
	};

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
</script>

<Group let:Title let:Content>
	<Title>Manage stages</Title>
	<Content class="flex flex-col gap-4 p-1">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-sm text-muted-foreground">
				{sortedStages.length}
				{sortedStages.length === 1 ? 'stage' : 'stages'}
			</p>
			<Button
				type="button"
				class="w-full gap-1 text-[12px] sm:w-[140px]"
				on:click={() => (dialog = { mode: 'create' })}
			>
				<Plus class="h-4 w-4" />
				Add stage
			</Button>
		</div>

		<div class="flex flex-col gap-3">
			{#if sortedStages.length === 0}
				<div
					class="flex flex-col items-center gap-4 rounded-md border border-border p-8 text-center"
				>
					<p class="text-sm text-muted-foreground">No stages added yet.</p>
					<Button
						type="button"
						class="gap-1 text-[12px]"
						on:click={() => (dialog = { mode: 'create' })}
					>
						<Plus class="h-4 w-4" />
						Add stage
					</Button>
				</div>
			{:else}
				<div class="overflow-hidden rounded-md border border-border">
					<div
						class="hidden grid-cols-[1fr_180px_180px_180px] border-b border-border bg-muted/30 px-4 py-3 text-left text-[11px] uppercase text-muted-foreground md:grid"
					>
						<p class="font-semibold">Stage</p>
						<p class="font-semibold">Starts at</p>
						<p class="font-semibold">Ends at</p>
						<p class="text-right font-semibold">Actions</p>
					</div>

					<div class="divide-y divide-border">
						{#each sortedStages as stage (stage.id)}
							<div
								class="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1fr_180px_180px_180px] md:items-center"
							>
								<div class="min-w-0">
									<p class="truncate font-semibold">{stage.name}</p>
								</div>
								<div>
									<p class="text-xs text-muted-foreground md:hidden">Starts at</p>
									<p class="text-sm">{formatStageDate(stage.startsAt)}</p>
								</div>
								<div>
									<p class="text-xs text-muted-foreground md:hidden">Ends at</p>
									<p class="text-sm">{formatStageDate(stage.endsAt)}</p>
								</div>
								<div class="flex flex-wrap justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										class="gap-1 text-[12px]"
										on:click={() => (dialog = { mode: 'update', stage })}
									>
										<Pencil class="h-3 w-3" />
										Edit
									</Button>
									<Button
										type="button"
										variant="destructive"
										class="gap-1 text-[12px]"
										on:click={() => (dialog = { mode: 'delete', stage })}
									>
										<Trash2 class="h-3 w-3" />
										Delete
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</Content>
</Group>

{#if dialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={(event) => {
			if (event.target === event.currentTarget) dialog = null;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') dialog = null;
		}}
	>
		<div
			class="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-lg font-semibold">
						{dialog.mode === 'create'
							? 'Add stage'
							: dialog.mode === 'update'
								? 'Edit stage'
								: 'Delete stage'}
					</p>
					{#if dialog.mode !== 'create'}
						<p class="text-sm text-muted-foreground">{dialog.stage.name}</p>
					{/if}
				</div>
				<Button type="button" variant="ghost" size="icon" on:click={() => (dialog = null)}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			{#if dialog.mode === 'delete'}
				<div class="flex flex-col gap-4">
					<p class="text-sm text-muted-foreground">
						Delete stage "{dialog.stage.name}"? This action cannot be undone.
					</p>

					{#if form?.action === 'deleteStage' && form.stageId === dialog.stage.id && form.message}
						<p class="text-sm text-destructive">{form.message}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							class="text-[12px]"
							on:click={() => (dialog = null)}
						>
							Cancel
						</Button>
						<form method="post" action="?/deleteStage" use:enhance={enhanceStageSubmit}>
							<input type="hidden" name="stageId" value={dialog.stage.id} />
							<Button type="submit" variant="destructive" class="gap-1 text-[12px]">
								<Trash2 class="h-3 w-3" />
								Delete stage
							</Button>
						</form>
					</div>
				</div>
			{:else}
				<form
					method="post"
					action={dialog.mode === 'create' ? '?/createStage' : '?/updateStage'}
					class="flex flex-col gap-4"
					use:enhance={enhanceStageSubmit}
				>
					{#if dialog.mode === 'update'}
						<input type="hidden" name="stageId" value={dialog.stage.id} />
					{/if}

					<div class="flex flex-col gap-1.5">
						<Label for="stage-dialog-name">Stage name</Label>
						<Input
							id="stage-dialog-name"
							name="name"
							placeholder="Group Stage, Finals, etc."
							required
							value={dialog.mode === 'update' ? dialog.stage.name : ''}
						/>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<Label for="stage-dialog-starts-at">Starts at</Label>
							<Input
								id="stage-dialog-starts-at"
								name="startsAt"
								type="datetime-local"
								required
								value={toDateTimeLocalValue(
									dialog.mode === 'update' ? dialog.stage.startsAt : tournament.startsAt
								)}
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="stage-dialog-ends-at">Ends at</Label>
							<Input
								id="stage-dialog-ends-at"
								name="endsAt"
								type="datetime-local"
								required
								value={toDateTimeLocalValue(
									dialog.mode === 'update' ? dialog.stage.endsAt : tournament.endsAt
								)}
							/>
						</div>
					</div>

					{#if form?.action === dialog.mode + 'Stage' && form.message}
						<p class="text-sm text-destructive">{form.message}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							class="text-[12px]"
							on:click={() => (dialog = null)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant={dialog.mode === 'create' ? 'accept' : 'default'}
							class="text-[12px]"
						>
							{dialog.mode === 'create' ? 'Add stage' : 'Save stage'}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
