<script lang="ts">
	import { enhance } from '$app/forms';
	import type { AugmentedZodDtoOutput } from '$lib/api/generated/model';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { X } from 'lucide-svelte';

	export let roster: AugmentedZodDtoOutput;
	export let form: TournamentEditActionResult | undefined;

	type Removal =
		| { kind: 'solo'; id: string; name: string }
		| { kind: 'team'; id: string; name: string }
		| null;

	let removal: Removal = null;

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

	const enhanceUnregister: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });
			if (result.type === 'success') removal = null;
		};
	};
</script>

<div class="flex flex-col gap-5">
	{#if form && !form.ok && form.action.startsWith('updateQualification')}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if roster.kind === 'solo'}
		<div class="flex flex-wrap gap-3">
			{#each soloParticipants as participant (participant.id)}
				<div class="flex flex-col gap-2">
					<a href="/users/{participant.id}">
						<PlayerCard
							avatarUrl={participant.avatarUrl}
							username={participant.osuUsername}
							seed={participant.seed}
						/>
					</a>
					<div class="flex gap-2">
						<form method="post" action="?/updateQualificationSolo" use:enhance class="flex-1">
							<input type="hidden" name="userId" value={participant.id} />
							<input
								type="hidden"
								name="withdrawn"
								value={participant.withdrawn ? 'false' : 'true'}
							/>
							<Button
								type="submit"
								size="sm"
								variant={participant.withdrawn ? 'outline' : 'destructive'}
								class="w-full"
							>
								{participant.withdrawn ? 'Restore' : 'Withdraw'}
							</Button>
						</form>
						<Button
							type="button"
							size="sm"
							variant="outline"
							on:click={() =>
								(removal = { kind: 'solo', id: participant.id, name: participant.osuUsername })}
						>
							Unregister
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col gap-6">
			{#each teams as team (team.id)}
				<Group let:Title let:Content>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<Title>
							{#if team.seed !== null}<span class="text-muted-foreground">#{team.seed}</span>{/if}
							{team.name}
						</Title>
						<div class="flex gap-2">
							<form method="post" action="?/updateQualificationTeam" use:enhance>
								<input type="hidden" name="teamId" value={team.id} />
								<input type="hidden" name="withdrawn" value={team.withdrawn ? 'false' : 'true'} />
								<Button
									type="submit"
									size="sm"
									variant={team.withdrawn ? 'outline' : 'destructive'}
								>
									{team.withdrawn ? 'Restore team' : 'Withdraw team'}
								</Button>
							</form>
							<Button
								type="button"
								size="sm"
								variant="outline"
								on:click={() => (removal = { kind: 'team', id: team.id, name: team.name })}
							>
								Unregister team
							</Button>
						</div>
					</div>

					<Content class="flex flex-wrap gap-3">
						{#each team.participants as participant (participant.id)}
							<div class="flex flex-col gap-2">
								<a href="/users/{participant.id}">
									<PlayerCard
										avatarUrl={participant.avatarUrl}
										username={participant.osuUsername}
									/>
								</a>
								<form method="post" action="?/updateQualificationTeamMember" use:enhance>
									<input type="hidden" name="teamId" value={team.id} />
									<input type="hidden" name="userId" value={participant.id} />
									<input
										type="hidden"
										name="withdrawn"
										value={participant.withdrawn ? 'false' : 'true'}
									/>
									<Button
										type="submit"
										size="sm"
										variant={participant.withdrawn ? 'outline' : 'destructive'}
										class="w-full"
									>
										{participant.withdrawn ? 'Restore' : 'Withdraw'}
									</Button>
								</form>
							</div>
						{/each}
					</Content>
				</Group>
			{/each}
		</div>
	{/if}
</div>

{#if removal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={(event) => {
			if (event.target === event.currentTarget) removal = null;
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') removal = null;
		}}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
		>
			<div class="mb-4 flex items-center justify-between gap-4">
				<p class="text-xl font-semibold">
					Unregister {removal.kind === 'team' ? 'team' : 'participant'}
				</p>
				<Button type="button" variant="ghost" size="icon" on:click={() => (removal = null)}>
					<X class="h-4 w-4" />
				</Button>
			</div>
			<p class="text-sm text-muted-foreground">
				Unregister {removal.name}? This action cannot be undone.
			</p>

			{#if form && !form.ok && form.action === (removal.kind === 'solo' ? 'unregisterQualificationSolo' : 'unregisterQualificationTeam')}
				<p class="mt-3 text-sm text-destructive">{form.message}</p>
			{/if}

			<div class="mt-6 flex justify-end gap-2">
				<Button type="button" variant="outline" on:click={() => (removal = null)}>Cancel</Button>
				<form
					method="post"
					action={removal.kind === 'solo'
						? '?/unregisterQualificationSolo'
						: '?/unregisterQualificationTeam'}
					use:enhance={enhanceUnregister}
				>
					{#if removal.kind === 'solo'}
						<input type="hidden" name="userId" value={removal.id} />
					{:else}
						<input type="hidden" name="teamId" value={removal.id} />
					{/if}
					<Button type="submit" variant="destructive">Unregister</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
