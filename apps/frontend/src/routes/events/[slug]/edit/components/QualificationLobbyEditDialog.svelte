<script lang="ts">
	import { enhance } from '$app/forms';
	import type {
		QualificationLobbyDtoOutput,
		TournamentStaffRoleDto
	} from '$lib/api/generated/model';
	import MultiplayerHistoryDialog from '$lib/components/multiplayerHistory/MultiplayerHistoryDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let lobby: QualificationLobbyDtoOutput;
	export let staff: TournamentStaffRoleDto[];
	export let form: TournamentEditActionResult | undefined;
	export let onClose: () => void;

	$: referees = staff.find((role) => role.name.toLowerCase() === 'referee')?.members ?? [];

	const enhanceAction: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });
			if (result.type === 'success') onClose();
		};
	};
</script>

<MultiplayerHistoryDialog {onClose}>
	<article class="space-y-5 p-5">
		<header class="pr-12">
			<h3 class="text-lg font-semibold">Edit lobby {lobby.number}</h3>
		</header>

		<form
			method="post"
			action="?/updateQualificationLobby"
			use:enhance={enhanceAction}
			class="space-y-5"
		>
			<input type="hidden" name="lobbyId" value={lobby.id} />
			<input type="hidden" name="stageId" value={lobby.stageId} />

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-1.5">
					<Label for={`lobby-number-${lobby.id}`}>Number</Label>
					<Input
						id={`lobby-number-${lobby.id}`}
						name="number"
						type="number"
						min="1"
						value={lobby.number}
						required
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for={`lobby-referee-${lobby.id}`}>Referee</Label>
					<select
						id={`lobby-referee-${lobby.id}`}
						name="refereeId"
						required
						class="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						{#each referees as referee}
							<option value={referee.id} selected={referee.id === lobby.referee.id}>
								{referee.osuUsername}
							</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for={`lobby-start-${lobby.id}`}>Starts at</Label>
					<Input
						id={`lobby-start-${lobby.id}`}
						name="startsAt"
						type="datetime-local"
						value={lobby.startsAt.slice(0, 16)}
						required
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for={`lobby-end-${lobby.id}`}>Ends at</Label>
					<Input
						id={`lobby-end-${lobby.id}`}
						name="endsAt"
						type="datetime-local"
						value={lobby.endsAt.slice(0, 16)}
						required
					/>
				</div>

				<div class="flex flex-col gap-1.5 sm:col-span-2">
					<Label for={`lobby-room-${lobby.id}`}>Room URL</Label>
					<Input id={`lobby-room-${lobby.id}`} name="mpUrl" type="url" value={lobby.mpUrl ?? ''} />
				</div>
			</div>

			{#if form?.action === 'updateQualificationLobby' && !form.ok && form.lobbyId === lobby.id}
				<p class="text-sm text-destructive">{form.message}</p>
			{/if}

			<div class="flex justify-end">
				<Button type="submit">Save lobby</Button>
			</div>
		</form>

		<div class="flex flex-wrap justify-between gap-2 border-t border-border pt-5">
			<form
				method="post"
				action={lobby.syncStatus === 'active'
					? '?/stopQualificationLobby'
					: '?/startQualificationLobby'}
				use:enhance={enhanceAction}
			>
				<input type="hidden" name="lobbyId" value={lobby.id} />
				<Button type="submit" variant="outline">
					{lobby.syncStatus === 'active' ? 'Stop sync' : 'Start sync'}
				</Button>
			</form>

			<form method="post" action="?/deleteQualificationLobby" use:enhance={enhanceAction}>
				<input type="hidden" name="lobbyId" value={lobby.id} />
				<Button type="submit" variant="destructive">Delete lobby</Button>
			</form>
		</div>

		{#if form && !form.ok && form.lobbyId === lobby.id && ['startQualificationLobby', 'stopQualificationLobby', 'deleteQualificationLobby'].includes(form.action)}
			<p class="text-sm text-destructive">{form.message}</p>
		{/if}
	</article>
</MultiplayerHistoryDialog>
