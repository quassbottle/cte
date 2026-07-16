<script lang="ts">
	import { enhance } from '$app/forms';
	import type { AugmentedZodDtoOutput } from '$lib/api/generated/model';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';

	export let roster: AugmentedZodDtoOutput;
	export let form: TournamentEditActionResult | undefined;

	const seedOrder = (left: number | null, right: number | null) =>
		left === right ? 0 : left === null ? 1 : right === null ? -1 : left - right;

	$: soloParticipants =
		roster.kind === 'solo'
			? [...roster.participants].sort(
					(left, right) =>
						seedOrder(left.seed, right.seed) || left.osuUsername.localeCompare(right.osuUsername)
				)
			: [];
	$: teams =
		roster.kind === 'team'
			? [...roster.teams].sort(
					(left, right) => seedOrder(left.seed, right.seed) || left.name.localeCompare(right.name)
				)
			: [];
</script>

<div class="flex flex-col gap-5">
	<p class="text-sm text-muted-foreground">Manage qualification seeds and withdrawals.</p>

	{#if form && !form.ok && form.action.startsWith('updateQualification')}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if roster.kind === 'solo'}
		<div class="flex flex-col gap-3">
			{#each soloParticipants as participant (participant.id)}
				<form
					method="post"
					action="?/updateQualificationSolo"
					use:enhance
					class="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_100px_auto_1fr_auto] md:items-end"
				>
					<input type="hidden" name="userId" value={participant.id} />
					<div class="min-w-0">
						<p class="truncate font-semibold">{participant.osuUsername}</p>
						<p class="text-xs text-muted-foreground">osu! {participant.osuId}</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for={`solo-seed-${participant.id}`}>Seed</Label>
						<Input
							id={`solo-seed-${participant.id}`}
							name="seed"
							type="number"
							min="1"
							value={participant.seed ?? ''}
						/>
					</div>
					<label class="flex h-10 items-center gap-2 text-sm">
						<input name="withdrawn" type="checkbox" checked={participant.withdrawn} />
						Withdrawn
					</label>
					<div class="flex flex-col gap-1.5">
						<Label for={`solo-reason-${participant.id}`}>Reason</Label>
						<Input
							id={`solo-reason-${participant.id}`}
							name="withdrawalReason"
							value={participant.withdrawalReason ?? ''}
							disabled={!participant.withdrawn}
						/>
					</div>
					<Button type="submit" class="text-[12px]">Save</Button>
				</form>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each teams as team (team.id)}
				<div class="flex flex-col gap-3 rounded-md border border-border p-4">
					<form
						method="post"
						action="?/updateQualificationTeam"
						use:enhance
						class="grid gap-3 md:grid-cols-[1fr_100px_auto_1fr_auto] md:items-end"
					>
						<input type="hidden" name="teamId" value={team.id} />
						<p class="min-w-0 truncate font-semibold">{team.name}</p>
						<div class="flex flex-col gap-1.5">
							<Label for={`team-seed-${team.id}`}>Seed</Label>
							<Input
								id={`team-seed-${team.id}`}
								name="seed"
								type="number"
								min="1"
								value={team.seed ?? ''}
							/>
						</div>
						<label class="flex h-10 items-center gap-2 text-sm">
							<input name="withdrawn" type="checkbox" checked={team.withdrawn} />
							Withdrawn
						</label>
						<div class="flex flex-col gap-1.5">
							<Label for={`team-reason-${team.id}`}>Reason</Label>
							<Input
								id={`team-reason-${team.id}`}
								name="withdrawalReason"
								value={team.withdrawalReason ?? ''}
								disabled={!team.withdrawn}
							/>
						</div>
						<Button type="submit" class="text-[12px]">Save team</Button>
					</form>

					<div class="flex flex-col gap-2 border-l border-border pl-4">
						{#each team.participants as participant (participant.id)}
							<form
								method="post"
								action="?/updateQualificationTeamMember"
								use:enhance
								class="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end"
							>
								<input type="hidden" name="teamId" value={team.id} />
								<input type="hidden" name="userId" value={participant.id} />
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{participant.osuUsername}</p>
									<p class="text-xs text-muted-foreground">osu! {participant.osuId}</p>
								</div>
								<label class="flex h-10 items-center gap-2 text-sm">
									<input name="withdrawn" type="checkbox" checked={participant.withdrawn} />
									Withdrawn
								</label>
								<div class="flex flex-col gap-1.5">
									<Label for={`member-reason-${team.id}-${participant.id}`}>Reason</Label>
									<Input
										id={`member-reason-${team.id}-${participant.id}`}
										name="withdrawalReason"
										value={participant.withdrawalReason ?? ''}
										disabled={!participant.withdrawn}
									/>
								</div>
								<Button type="submit" variant="outline" class="text-[12px]">Save member</Button>
							</form>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
