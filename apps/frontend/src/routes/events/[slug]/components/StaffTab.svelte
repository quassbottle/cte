<script lang="ts">
	import type { TournamentStaffRoleDto } from '$lib/api/generated/model';
	import RosterGroups from './RosterGroups.svelte';

	export let staff: TournamentStaffRoleDto[];
</script>

<div class="flex flex-col gap-3">
	<RosterGroups groups={staff.map((role) => ({ ...role, members: role.members }))} />
</div>
