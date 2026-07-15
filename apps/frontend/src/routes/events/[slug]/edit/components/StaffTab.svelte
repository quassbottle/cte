<script lang="ts">
	import { enhance } from '$app/forms';
	import type { TournamentStaffRole } from '$lib/types/tournament-staff';
	import { Button } from '$lib/components/ui/button';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import ScheduleUserPicker from './ScheduleUserPicker.svelte';

	export let staff: TournamentStaffRole[];
	export let form: TournamentEditActionResult | undefined;
</script>

<div class="flex flex-col gap-4">
	{#each staff as role (role.id)}
		<div class="rounded-md border border-border p-4">
			<p class="mb-3 font-semibold">{role.name}</p>
			<div class="mb-3 flex flex-wrap gap-2">
				{#each role.members as member (member.id)}
					<form method="post" action="?/removeTournamentStaff" use:enhance class="flex items-center gap-2 rounded border px-2 py-1 text-sm">
						<input type="hidden" name="roleId" value={role.id} />
						<input type="hidden" name="userId" value={member.id} />
						<span>{member.osuUsername}</span><Button type="submit" size="sm" variant="ghost">Remove</Button>
					</form>
				{/each}
			</div>
			<form method="post" action="?/assignTournamentStaff" use:enhance class="flex flex-col gap-2">
				<input type="hidden" name="roleId" value={role.id} />
				<ScheduleUserPicker label={`Add ${role.name}`} name="userId" />
				<Button type="submit" class="self-start" size="sm">Assign</Button>
			</form>
			{#if form && !form.ok && form.roleId === role.id}<p class="mt-2 text-sm text-destructive">{form.message}</p>{/if}
		</div>
	{/each}
</div>
