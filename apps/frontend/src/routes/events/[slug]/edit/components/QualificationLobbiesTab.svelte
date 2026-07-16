<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { QualificationLobbyDtoOutput, StageDtoOutput } from '$lib/api/generated/model';
	import QualificationLobbyCard from '$lib/components/qualificationLobby/qualificationLobby.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { TournamentStaffRole } from '$lib/types/tournament-staff';
	import { onDestroy } from 'svelte';

	export let stages: StageDtoOutput[];
	export let lobbies: QualificationLobbyDtoOutput[];
	export let staff: TournamentStaffRole[];

	let timer: ReturnType<typeof setInterval> | undefined;
	$: qualificationStages = stages.filter((stage) => stage.type === 'qualification');
	$: referees = staff.find((role) => role.name.toLowerCase() === 'referee')?.members ?? [];
	$: hasActiveSync = lobbies.some((lobby) => lobby.syncStatus === 'active');
	$: {
		if (browser && hasActiveSync && !timer) timer = setInterval(() => void invalidateAll(), 10_000);
		if (browser && !hasActiveSync && timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}
	onDestroy(() => timer && clearInterval(timer));
</script>

<div class="flex flex-col gap-6">
	{#each qualificationStages as stage}
		<section class="flex flex-col gap-3">
			<h2 class="font-semibold">{stage.name}</h2>
			<form
				method="post"
				action="?/createQualificationLobby"
				use:enhance
				class="grid gap-2 rounded-md border border-border p-3 md:grid-cols-5"
			>
				<input type="hidden" name="stageId" value={stage.id} />
				<Input name="number" type="number" min="1" placeholder="Lobby #" required />
				<select
					name="refereeId"
					required
					class="rounded-md border border-input bg-background px-3 text-sm"
				>
					<option value="">Referee</option>
					{#each referees as referee}<option value={referee.id}>{referee.osuUsername}</option
						>{/each}
				</select>
				<Input name="startsAt" type="datetime-local" required />
				<Input name="endsAt" type="datetime-local" required />
				<Button type="submit">Add lobby</Button>
			</form>

			<div class="grid gap-3 md:grid-cols-2">
				{#each lobbies.filter((lobby) => lobby.stageId === stage.id) as lobby (lobby.id)}
					<QualificationLobbyCard {lobby}>
						<div slot="actions" class="space-y-2">
							<div class="flex gap-2">
								<form
									method="post"
									action={lobby.syncStatus === 'active'
										? '?/stopQualificationLobby'
										: '?/startQualificationLobby'}
									use:enhance
								>
									<input type="hidden" name="lobbyId" value={lobby.id} />
									<Button type="submit" size="sm" variant="outline"
										>{lobby.syncStatus === 'active' ? 'Stop' : 'Start'}</Button
									>
								</form>
								<form method="post" action="?/deleteQualificationLobby" use:enhance>
									<input type="hidden" name="lobbyId" value={lobby.id} />
									<Button type="submit" size="sm" variant="destructive">Delete</Button>
								</form>
							</div>
							<form
								method="post"
								action="?/updateQualificationLobby"
								use:enhance
								class="grid gap-2"
							>
								<input type="hidden" name="lobbyId" value={lobby.id} />
								<input type="hidden" name="stageId" value={lobby.stageId} />
								<Input name="number" type="number" min="1" value={lobby.number} required />
								<select
									name="refereeId"
									required
									class="rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									{#each referees as referee}<option
											value={referee.id}
											selected={referee.id === lobby.refereeId}>{referee.osuUsername}</option
										>{/each}
								</select>
								<Input
									name="startsAt"
									type="datetime-local"
									value={lobby.startsAt.slice(0, 16)}
									required
								/>
								<Input
									name="endsAt"
									type="datetime-local"
									value={lobby.endsAt.slice(0, 16)}
									required
								/>
								<Input name="mpUrl" value={lobby.mpUrl ?? ''} placeholder="Multiplayer URL" />
								<Button type="submit" size="sm" variant="outline">Save lobby</Button>
							</form>
						</div>
					</QualificationLobbyCard>
				{/each}
			</div>
		</section>
	{/each}
</div>
