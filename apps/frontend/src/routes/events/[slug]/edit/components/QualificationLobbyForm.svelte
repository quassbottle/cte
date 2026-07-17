<script lang="ts">
	import { enhance } from '$app/forms';
	import type { TournamentStaffRoleDto } from '$lib/api/generated/model';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';

	export let stageId: string;
	export let staff: TournamentStaffRoleDto[];
	export let form: TournamentEditActionResult | undefined;
	export let defaultNumber = 1;
	export let onCancel: () => void;

	$: referees = staff.find((role) => role.name.toLowerCase() === 'referee')?.members ?? [];
</script>

<form
	method="post"
	action="?/createQualificationLobby"
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ invalidateAll: true });
			if (result.type === 'success') onCancel();
		}}
	class="flex flex-col gap-5"
>
	<input type="hidden" name="stageId" value={stageId} />

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for={`new-lobby-number-${stageId}`}>Number</Label>
			<Input
				id={`new-lobby-number-${stageId}`}
				name="number"
				type="number"
				min="1"
				value={defaultNumber}
				required
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for={`new-lobby-referee-${stageId}`}>Referee</Label>
			<select
				id={`new-lobby-referee-${stageId}`}
				name="refereeId"
				required
				class="h-10 rounded-md border border-input bg-background px-3 text-sm"
			>
				<option value="">Select referee</option>
				{#each referees as referee}
					<option value={referee.id}>{referee.osuUsername}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for={`new-lobby-start-${stageId}`}>Starts at</Label>
			<Input id={`new-lobby-start-${stageId}`} name="startsAt" type="datetime-local" required />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for={`new-lobby-end-${stageId}`}>Ends at</Label>
			<Input id={`new-lobby-end-${stageId}`} name="endsAt" type="datetime-local" required />
		</div>

		<div class="flex flex-col gap-1.5 sm:col-span-2">
			<Label for={`new-lobby-room-${stageId}`}>Room URL</Label>
			<Input id={`new-lobby-room-${stageId}`} name="mpUrl" type="url" />
		</div>
	</div>

	{#if form?.action === 'createQualificationLobby' && !form.ok && form.stageId === stageId}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div class="flex justify-end gap-2">
		<Button type="button" variant="outline" on:click={onCancel}>Cancel</Button>
		<Button type="submit">Add lobby</Button>
	</div>
</form>
