<script lang="ts">
	import type { TournamentStaffRoleDto } from '$lib/api/generated/model';
	import RosterGroups from './RosterGroups.svelte';
	import { visibleStaffRoles } from './staff-tab';

	export let staff: TournamentStaffRoleDto[];
	$: groups = visibleStaffRoles(staff);
</script>

<div class="flex flex-col gap-3">
	<RosterGroups {groups} />
</div>
