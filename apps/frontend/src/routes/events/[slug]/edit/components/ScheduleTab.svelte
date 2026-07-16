<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type {
		StageDtoOutput,
		StageScheduleDtoOutput,
		StageScheduleDtoOutputMatchesItem
	} from '$lib/api/generated/model';
	import Schedule from '$lib/components/schedule/schedule.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Pencil, Plus, Trash2, X } from 'lucide-svelte';
	import ScheduleMatchForm from './ScheduleMatchForm.svelte';

	export let stages: StageDtoOutput[];
	export let schedule: StageScheduleDtoOutput[];
	export let tournamentId: string;
	export let isTeam = false;
	export let form: TournamentEditActionResult | undefined;
	$: regularStages = stages.filter((stage) => stage.type !== 'qualification');
	$: regularSchedule = schedule.filter((stage) => stage.type !== 'qualification');

	let dialog:
		| {
				mode: 'create';
				stageId: string;
		  }
		| {
				mode: 'update';
				stageId: string;
				match: StageScheduleDtoOutputMatchesItem;
		  }
		| {
				mode: 'delete';
				match: StageScheduleDtoOutputMatchesItem;
		  }
		| null = null;

	$: sortedSchedule = [...regularSchedule].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
	$: matchesCount = sortedSchedule.reduce((total, stage) => total + stage.matches.length, 0);
	$: requestedStageId = $page.url.searchParams.get('stage');
	$: activeStageId = getActiveStageId(requestedStageId);
	$: activeStage = sortedSchedule.find((stage) => stage.id === activeStageId) ?? sortedSchedule[0];
	$: currentDialog = dialog;
	$: dialogStage =
		currentDialog && currentDialog.mode !== 'delete'
			? sortedSchedule.find((stage) => stage.id === currentDialog.stageId)
			: undefined;

	function getActiveStageId(value: string | null) {
		if (value && sortedSchedule.some((stage) => stage.id === value)) {
			return value;
		}

		return sortedSchedule[0]?.id ?? regularStages[0]?.id ?? '';
	}

	function getStageTabHref(stageId: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('tab', 'schedule');
		params.set('stage', stageId);
		const query = params.toString();
		return query ? `${$page.url.pathname}?${query}` : $page.url.pathname;
	}

	function getNextMatchNumber(stage: StageScheduleDtoOutput | undefined) {
		if (!stage) {
			return 1;
		}

		return Math.max(0, ...stage.matches.map((match, index) => match.matchNumber ?? index + 1)) + 1;
	}

	const enhanceDeleteMatch: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });

			if (result.type === 'success') {
				dialog = null;
			}
		};
	};
</script>

<div class="flex flex-col gap-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<p class="text-sm text-muted-foreground">
			{matchesCount}
			{matchesCount === 1 ? 'match' : 'matches'}
		</p>

		<Button
			type="button"
			class="w-full gap-1 text-[12px] sm:w-[140px]"
			on:click={() => activeStageId && (dialog = { mode: 'create', stageId: activeStageId })}
			disabled={regularStages.length === 0 || !activeStageId}
		>
			<Plus class="h-4 w-4" />
			Add match
		</Button>
	</div>

	{#if regularStages.length === 0 || sortedSchedule.length === 0}
		<div class="rounded-md border border-border p-6 text-sm text-muted-foreground">
			Add at least one stage before creating schedule matches.
		</div>
	{:else}
		<TabGroup
			value={activeStageId}
			let:Head
			let:ContentItem
			class="flex flex-col gap-4 md:flex-row"
		>
			<div class="w-full md:sticky md:top-8 md:w-[160px] md:shrink-0 md:self-start">
				<Head let:Item class="flex flex-col gap-2">
					{#each sortedSchedule as stage}
						<Item
							value={stage.id}
							href={getStageTabHref(stage.id)}
							class="mr-0"
							buttonClass={buttonVariants({
								variant: 'default',
								size: 'sm',
								className: 'w-full justify-center'
							})}
						>
							{stage.name}
						</Item>
					{/each}
				</Head>
			</div>

			<div class="min-w-0 flex-1 md:border-l md:border-border md:pl-6">
				{#each sortedSchedule as stage}
					<ContentItem class="flex flex-col gap-3" value={stage.id}>
						<div class="flex items-center justify-between gap-3">
							<p class="font-semibold">{stage.name}</p>
							<p class="text-xs text-muted-foreground">
								{stage.matches.length}
								{stage.matches.length === 1 ? 'match' : 'matches'}
							</p>
						</div>

						{#if stage.matches.length === 0}
							<div
								class="rounded-md border border-border p-8 text-center text-sm text-muted-foreground"
							>
								No matches added yet.
							</div>
						{:else}
							<Schedule matches={stage.matches} editable>
								<div slot="actions" let:match class="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										class="gap-1 text-[12px]"
										on:click={() => (dialog = { mode: 'update', stageId: stage.id, match })}
									>
										<Pencil class="h-3 w-3" />
										Edit
									</Button>

									<Button
										type="button"
										variant="destructive"
										class="gap-1 text-[12px]"
										on:click={() => (dialog = { mode: 'delete', match })}
									>
										<Trash2 class="h-3 w-3" />
										Delete
									</Button>
								</div>
							</Schedule>
						{/if}
					</ContentItem>
				{/each}
			</div>
		</TabGroup>
	{/if}
</div>

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
			class="max-h-[90dvh] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-lg font-semibold">
						{dialog.mode === 'create'
							? 'Add match'
							: dialog.mode === 'update'
								? 'Edit match'
								: 'Delete match'}
					</p>
					<p class="text-sm text-muted-foreground">
						{dialogStage?.name ?? activeStage?.name ?? 'Selected stage'}
					</p>
				</div>
				<Button type="button" variant="ghost" size="icon" on:click={() => (dialog = null)}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			{#if dialog.mode === 'create'}
				<ScheduleMatchForm
					stage={dialogStage}
					{tournamentId}
					stageId={dialog.stageId}
					{form}
					{isTeam}
					mode="create"
					defaultMatchNumber={getNextMatchNumber(dialogStage)}
					onCancel={() => (dialog = null)}
				/>
			{:else if dialog.mode === 'update'}
				<div class="flex flex-col gap-3">
					<div class="flex justify-end gap-2">
						<form method="post" action="?/syncScheduleMatch" use:enhance={enhanceDeleteMatch}>
							<input type="hidden" name="matchId" value={dialog.match.id} />
							<Button type="submit" variant="outline" class="text-[12px]">Sync</Button>
						</form>
						{#if dialog.match.syncStatus === 'active'}
							<form method="post" action="?/stopScheduleMatch" use:enhance={enhanceDeleteMatch}>
								<input type="hidden" name="matchId" value={dialog.match.id} />
								<Button type="submit" variant="outline" class="text-[12px]">Stop sync</Button>
							</form>
						{/if}
					</div>
					<ScheduleMatchForm
						stage={dialogStage}
						{tournamentId}
						stageId={dialog.stageId}
						match={dialog.match}
						{form}
						{isTeam}
						mode="update"
						onCancel={() => (dialog = null)}
					/>
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					<p class="text-sm text-muted-foreground">
						Delete match "{dialog.match.name}"? This action cannot be undone.
					</p>

					{#if form?.action === 'deleteScheduleMatch' && !form.ok && form.matchId === dialog.match.id}
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
						<form method="post" action="?/deleteScheduleMatch" use:enhance={enhanceDeleteMatch}>
							<input type="hidden" name="matchId" value={dialog.match.id} />
							<Button type="submit" variant="destructive" class="gap-1 text-[12px]">
								<Trash2 class="h-3 w-3" />
								Delete match
							</Button>
						</form>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
