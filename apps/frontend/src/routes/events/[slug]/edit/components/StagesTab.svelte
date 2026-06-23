<script lang="ts">
	import { enhance } from '$app/forms';
	import type { StageDto, TournamentDto } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	export let tournament: TournamentDto;
	export let stages: StageDto[];
	export let form:
		| {
				action?: string;
				message?: string;
				stageId?: string;
		  }
		| undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	$: sortedStages = [...stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
</script>

<Group let:Title let:Content>
	<Title>Manage stages</Title>
	<Content class="flex flex-col gap-6 p-1">
		<form method="post" action="?/createStage" class="flex flex-col gap-4" use:enhance>
			<div class="flex w-full max-w-2xl flex-col gap-1.5">
				<Label for="stage-name">Stage name</Label>
				<Input id="stage-name" name="name" placeholder="Group Stage, Finals, etc." required />
			</div>

			<div class="flex flex-col gap-4 md:flex-row">
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="stage-starts-at">Starts at</Label>
					<Input
						id="stage-starts-at"
						name="startsAt"
						type="datetime-local"
						required
						value={toDateTimeLocalValue(tournament.startsAt)}
					/>
				</div>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="stage-ends-at">Ends at</Label>
					<Input
						id="stage-ends-at"
						name="endsAt"
						type="datetime-local"
						required
						value={toDateTimeLocalValue(tournament.endsAt)}
					/>
				</div>
			</div>

			{#if form?.action === 'createStage' && form.message}
				<p class="text-sm text-destructive">{form.message}</p>
			{/if}

			<div>
				<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
					Add stage
				</Button>
			</div>
		</form>

		<div class="flex flex-col gap-2">
			<p class="text-sm font-medium">Current stages</p>
			{#if sortedStages.length === 0}
				<p class="text-sm text-muted-foreground">No stages added yet.</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each sortedStages as stage (stage.id)}
						<div class="border-border rounded-md border px-3 py-3">
							<form method="post" action="?/updateStage" use:enhance>
								<input type="hidden" name="stageId" value={stage.id} />
								<div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-name-${stage.id}`}>Stage name</Label>
										<Input id={`stage-name-${stage.id}`} name="name" value={stage.name} />
									</div>
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-starts-at-${stage.id}`}>Starts at</Label>
										<Input
											id={`stage-starts-at-${stage.id}`}
											name="startsAt"
											type="datetime-local"
											value={toDateTimeLocalValue(stage.startsAt)}
										/>
									</div>
									<div class="flex flex-col gap-1.5">
										<Label for={`stage-ends-at-${stage.id}`}>Ends at</Label>
										<Input
											id={`stage-ends-at-${stage.id}`}
											name="endsAt"
											type="datetime-local"
											value={toDateTimeLocalValue(stage.endsAt)}
										/>
									</div>
								</div>

								{#if form?.action === 'updateStage' && form.stageId === stage.id && form.message}
									<p class="mt-2 text-sm text-destructive">{form.message}</p>
								{/if}

								<div class="mt-3 flex items-center gap-2">
									<Button variant="outline" type="submit">Save</Button>
								</div>
							</form>

							<form method="post" action="?/deleteStage" class="mt-2" use:enhance>
								<input type="hidden" name="stageId" value={stage.id} />
								<Button variant="destructive" type="submit">Delete</Button>
								{#if form?.action === 'deleteStage' && form.stageId === stage.id && form.message}
									<p class="mt-2 text-sm text-destructive">{form.message}</p>
								{/if}
							</form>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Content>
</Group>
