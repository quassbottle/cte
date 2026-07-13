<script lang="ts">
	import { enhance } from '$app/forms';
	import type { StageDtoOutput, StageScheduleDtoOutputMatchesItem } from '$lib/api/generated/model';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import type { SelectedUser } from '$lib/schemas/user.schema';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import type { SubmitFunction } from '@sveltejs/kit';
	import ScheduleUserPicker from './ScheduleUserPicker.svelte';

	export let stages: StageDtoOutput[];
	export let teams: { id: string; name: string }[] = [];
	export let isTeam = false;
	export let match: StageScheduleDtoOutputMatchesItem | undefined = undefined;
	export let stageId: string | undefined = undefined;
	export let form: TournamentEditActionResult | undefined;
	export let mode: 'create' | 'update' = 'create';
	export let onCancel: (() => void) | undefined = undefined;
	export let defaultMatchNumber: number | undefined = undefined;

	const toDateTimeLocalValue = (value: Date | string) => {
		const date = new Date(value);
		const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
		return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
	};

	const toSelectedUser = (user: {
		id: string;
		osuId: number;
		osuUsername: string;
		avatarUrl: string;
	}): SelectedUser => ({
		id: user.id,
		osuId: user.osuId,
		osuUsername: user.osuUsername,
		avatarUrl: user.avatarUrl
	});

	const addHours = (value: Date | string, hours: number) =>
		new Date(new Date(value).valueOf() + hours * 60 * 60 * 1000);

	$: selectedStageId = stageId ?? stages[0]?.id ?? '';
	$: defaultStart =
		match?.startsAt ?? stages.find((stage) => stage.id === selectedStageId)?.startsAt ?? new Date();
	$: defaultEnd = match?.endsAt ?? addHours(defaultStart, 1);

	let player1Users = match?.players[0] ? [toSelectedUser(match.players[0])] : [];
	let player2Users = match?.players[1] ? [toSelectedUser(match.players[1])] : [];
	let redTeamId = match?.redTeam?.id ?? '';
	let blueTeamId = match?.blueTeam?.id ?? '';
	let refereeUsers =
		match?.staff.filter((staff) => staff.role === 'referee').map(toSelectedUser) ?? [];
	let streamerUsers =
		match?.staff.filter((staff) => staff.role === 'streamer').map(toSelectedUser) ?? [];
	let commentatorUsers =
		match?.staff.filter((staff) => staff.role === 'commentator').map(toSelectedUser) ?? [];

	$: actionName = mode === 'create' ? 'createScheduleMatch' : 'updateScheduleMatch';
	$: action = mode === 'create' ? '?/createScheduleMatch' : '?/updateScheduleMatch';
	$: submitLabel = mode === 'create' ? 'Add match' : 'Save match';

	const enhanceScheduleMatch: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });

			if (result.type === 'success') {
				onCancel?.();
			}
		};
	};
</script>

<form
	method="post"
	{action}
	use:enhance={enhanceScheduleMatch}
	class="flex flex-col gap-4 rounded-md border border-border p-4"
>
	{#if match}
		<input type="hidden" name="matchId" value={match.id} />
	{/if}

	<input type="hidden" name="stageId" value={selectedStageId} />

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
		<div class="flex flex-col gap-1.5">
			<Label for={`match-name-${match?.id ?? 'new'}`}>Match name</Label>
			<Input
				id={`match-name-${match?.id ?? 'new'}`}
				name="name"
				value={match?.name ?? 'Match'}
				required
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for={`match-number-${match?.id ?? 'new'}`}>Number</Label>
			<Input
				id={`match-number-${match?.id ?? 'new'}`}
				name="matchNumber"
				type="number"
				min="1"
				value={match?.matchNumber ?? defaultMatchNumber ?? ''}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for={`match-start-${match?.id ?? 'new'}`}>Starts at</Label>
			<Input
				id={`match-start-${match?.id ?? 'new'}`}
				name="startsAt"
				type="datetime-local"
				value={toDateTimeLocalValue(defaultStart)}
				required
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for={`match-end-${match?.id ?? 'new'}`}>Ends at</Label>
			<Input
				id={`match-end-${match?.id ?? 'new'}`}
				name="endsAt"
				type="datetime-local"
				value={toDateTimeLocalValue(defaultEnd)}
				required
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
		<div class="flex flex-col gap-1.5">
			<Label for={`match-mp-${match?.id ?? 'new'}`}>MP link</Label>
			<Input id={`match-mp-${match?.id ?? 'new'}`} name="mpUrl" value={match?.mpUrl ?? ''} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for={`match-vod-${match?.id ?? 'new'}`}>VOD link</Label>
			<Input id={`match-vod-${match?.id ?? 'new'}`} name="vodUrl" value={match?.vodUrl ?? ''} />
		</div>
	</div>

	{#if isTeam}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="flex flex-col gap-2 rounded-md border border-border p-3">
				<Label for={`match-red-team-${match?.id ?? 'new'}`}>Red team</Label>
				<select
					id={`match-red-team-${match?.id ?? 'new'}`}
					name="redTeamId"
					bind:value={redTeamId}
					required
					class="h-10 rounded-md border border-input bg-background px-3"
				>
					<option value="" disabled>Select team</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
				<Label for={`match-red-score-${match?.id ?? 'new'}`}>Score</Label>
				<Input
					id={`match-red-score-${match?.id ?? 'new'}`}
					name="redScore"
					type="number"
					min="0"
					disabled={match?.syncStatus === 'active'}
					value={match?.redScore ?? ''}
				/>
			</div>
			<div class="flex flex-col gap-2 rounded-md border border-border p-3">
				<Label for={`match-blue-team-${match?.id ?? 'new'}`}>Blue team</Label>
				<select
					id={`match-blue-team-${match?.id ?? 'new'}`}
					name="blueTeamId"
					bind:value={blueTeamId}
					required
					class="h-10 rounded-md border border-input bg-background px-3"
				>
					<option value="" disabled>Select team</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
				<Label for={`match-blue-score-${match?.id ?? 'new'}`}>Score</Label>
				<Input
					id={`match-blue-score-${match?.id ?? 'new'}`}
					name="blueScore"
					type="number"
					min="0"
					disabled={match?.syncStatus === 'active'}
					value={match?.blueScore ?? ''}
				/>
			</div>
		</div>
	{:else}
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="flex flex-col gap-2 rounded-md border border-border p-3">
			<ScheduleUserPicker label="Player 1" name="player1UserId" bind:selectedUsers={player1Users} />
			<div class="flex max-w-[160px] flex-col gap-1.5">
				<Label for={`match-score-1-${match?.id ?? 'new'}`}>Score</Label>
				<Input
					id={`match-score-1-${match?.id ?? 'new'}`}
					name="player1Score"
					type="number"
					min="0"
					disabled={match?.syncStatus === 'active'}
					value={match?.players[0]?.score ?? ''}
				/>
			</div>
		</div>
		<div class="flex flex-col gap-2 rounded-md border border-border p-3">
			<ScheduleUserPicker label="Player 2" name="player2UserId" bind:selectedUsers={player2Users} />
			<div class="flex max-w-[160px] flex-col gap-1.5">
				<Label for={`match-score-2-${match?.id ?? 'new'}`}>Score</Label>
				<Input
					id={`match-score-2-${match?.id ?? 'new'}`}
					name="player2Score"
					type="number"
					min="0"
					disabled={match?.syncStatus === 'active'}
					value={match?.players[1]?.score ?? ''}
				/>
			</div>
		</div>
	</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<ScheduleUserPicker label="Referee" name="refereeId" bind:selectedUsers={refereeUsers} />
		<ScheduleUserPicker label="Streamer" name="streamerId" bind:selectedUsers={streamerUsers} />
		<ScheduleUserPicker
			label="Commentators"
			name="commentatorIds"
			multiple
			bind:selectedUsers={commentatorUsers}
		/>
	</div>

	{#if form?.action === actionName && !form.ok && form.matchId === match?.id}
		<p class="text-sm text-destructive">{form.message}</p>
	{/if}

	<div>
		<Button class="w-[140px] bg-accept text-[12px]" variant="accept" type="submit">
			{submitLabel}
		</Button>
		{#if onCancel}
			<Button type="button" variant="outline" class="ml-2 text-[12px]" on:click={onCancel}>
				Cancel
			</Button>
		{/if}
	</div>
</form>
