<script lang="ts">
	import { enhance } from '$app/forms';
	import type {
		TournamentStaffRoleDto,
		TournamentStaffRoleDtoMembersItem
	} from '$lib/api/generated/model';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import { X } from 'lucide-svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { sortedStaffRoles } from '../../components/staff-tab';
	import TournamentUserPicker from './TournamentUserPicker.svelte';

	export let staff: TournamentStaffRoleDto[];
	export let form: TournamentEditActionResult | undefined;

	let selectedRole: TournamentStaffRoleDto | null = null;
	let selectedUserId: string | undefined;
	let removal: {
		role: TournamentStaffRoleDto;
		member: TournamentStaffRoleDtoMembersItem;
	} | null = null;

	$: roles = sortedStaffRoles(staff);

	const closeDialog = () => {
		selectedRole = null;
		selectedUserId = undefined;
	};

	const enhanceRemoveStaff: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ invalidateAll: true });
			if (result.type === 'success') removal = null;
		};
	};
</script>

<div class="flex flex-col gap-6">
	{#each roles as role (role.id)}
		<Group let:Title let:Content>
			<div class="flex items-center justify-between gap-4">
				<Title>{role.name}</Title>
				<Button
					type="button"
					size="sm"
					on:click={() => {
						selectedRole = role;
					}}>Add</Button
				>
			</div>
			<Content class="flex flex-wrap gap-3">
				{#each role.members as member (member.id)}
					<div class="flex flex-col gap-2">
						<a href="/users/{member.id}">
							<PlayerCard avatarUrl={member.avatarUrl} username={member.osuUsername} />
						</a>
						<Button
							type="button"
							size="sm"
							variant="outline"
							class="w-full"
							on:click={() => (removal = { role, member })}>Remove</Button
						>
					</div>
				{/each}
			</Content>
		</Group>
	{/each}
</div>

{#if selectedRole}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={(event) => {
			if (event.target === event.currentTarget) closeDialog();
		}}
		on:keydown={(event) => {
			if (event.key === 'Escape') closeDialog();
		}}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
		>
			<div class="mb-4 flex items-center justify-between gap-4">
				<p class="text-xl font-semibold">Add {selectedRole.name}</p>
				<Button type="button" variant="ghost" size="icon" on:click={closeDialog}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<form
				method="post"
				action="?/assignTournamentStaff"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') closeDialog();
					}}
				class="flex flex-col gap-4"
			>
				<input type="hidden" name="roleId" value={selectedRole.id} />
				<TournamentUserPicker
					label="User"
					name="userId"
					placeholder="Search user"
					bind:selectedId={selectedUserId}
				/>
				{#if form && !form.ok && form.roleId === selectedRole.id}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
				<div class="flex justify-end gap-2">
					<Button type="button" variant="outline" on:click={closeDialog}>Cancel</Button>
					<Button type="submit" disabled={!selectedUserId}>Assign</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

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
				<p class="text-xl font-semibold">Remove {removal.role.name}</p>
				<Button type="button" variant="ghost" size="icon" on:click={() => (removal = null)}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<p class="text-sm text-muted-foreground">
				Remove {removal.member.osuUsername} from {removal.role.name}?
			</p>

			{#if form?.action === 'removeTournamentStaff' && !form.ok && form.userId === removal.member.id}
				<p class="mt-3 text-sm text-destructive">{form.message}</p>
			{/if}

			<div class="mt-6 flex justify-end gap-2">
				<Button type="button" variant="outline" on:click={() => (removal = null)}>Cancel</Button>
				<form method="post" action="?/removeTournamentStaff" use:enhance={enhanceRemoveStaff}>
					<input type="hidden" name="roleId" value={removal.role.id} />
					<input type="hidden" name="userId" value={removal.member.id} />
					<Button type="submit" variant="destructive">Remove staff</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
