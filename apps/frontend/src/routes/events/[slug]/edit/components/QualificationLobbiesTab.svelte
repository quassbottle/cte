<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type {
		QualificationLobbyDtoOutput,
		StageDtoOutput,
		TournamentStaffRoleDto
	} from '$lib/api/generated/model';
	import QualificationLobbyCard from '$lib/components/qualificationLobby/qualificationLobby.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { onDestroy } from 'svelte';

	export let stages: StageDtoOutput[];
	export let lobbies: QualificationLobbyDtoOutput[];
	export let staff: TournamentStaffRoleDto[];

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
				class="grid gap-2 rounded-md border border-border p-3 md:grid-cols-3"
			>
				<input type="hidden" name="stageId" value={stage.id} />
				<label for={`new-lobby-number-${stage.id}`}>Number</label>
				<Input id={`new-lobby-number-${stage.id}`} name="number" type="number" min="1" required />
				<label for={`new-lobby-referee-${stage.id}`}>Referee</label>
				<select
					id={`new-lobby-referee-${stage.id}`}
					name="refereeId"
					required
					class="rounded-md border border-input bg-background px-3 text-sm"
				>
					<option value="">Select referee</option>
					{#each referees as referee}<option value={referee.id}>{referee.osuUsername}</option
						>{/each}
				</select>
				<label for={`new-lobby-start-${stage.id}`}>Starts at</label>
				<Input id={`new-lobby-start-${stage.id}`} name="startsAt" type="datetime-local" required />
				<label for={`new-lobby-end-${stage.id}`}>Ends at</label>
				<Input id={`new-lobby-end-${stage.id}`} name="endsAt" type="datetime-local" required />
				<label for={`new-lobby-room-${stage.id}`}>Room URL</label>
				<Input id={`new-lobby-room-${stage.id}`} name="mpUrl" type="url" />
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
								<label for={`lobby-number-${lobby.id}`}>Number</label>
								<Input
									id={`lobby-number-${lobby.id}`}
									name="number"
									type="number"
									min="1"
									value={lobby.number}
									required
								/>
								<label for={`lobby-referee-${lobby.id}`}>Referee</label>
								<select
									id={`lobby-referee-${lobby.id}`}
									name="refereeId"
									required
									class="rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									{#each referees as referee}<option
											value={referee.id}
											selected={referee.id === lobby.refereeId}>{referee.osuUsername}</option
										>{/each}
								</select>
								<label for={`lobby-start-${lobby.id}`}>Starts at</label>
								<Input
									id={`lobby-start-${lobby.id}`}
									name="startsAt"
									type="datetime-local"
									value={lobby.startsAt.slice(0, 16)}
									required
								/>
								<label for={`lobby-end-${lobby.id}`}>Ends at</label>
								<Input
									id={`lobby-end-${lobby.id}`}
									name="endsAt"
									type="datetime-local"
									value={lobby.endsAt.slice(0, 16)}
									required
								/>
								<label for={`lobby-room-${lobby.id}`}>Room URL</label>
								<Input
									id={`lobby-room-${lobby.id}`}
									name="mpUrl"
									type="url"
									value={lobby.mpUrl ?? ''}
								/>
								<Button type="submit" size="sm" variant="outline">Save lobby</Button>
							</form>
						</div>
					</QualificationLobbyCard>
				{/each}
			</div>
		</section>
	{/each}
</div>
