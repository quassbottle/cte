<script lang="ts">
	import type { TournamentStaffRole } from '$lib/types/tournament-staff';
	import RosterGroups from './RosterGroups.svelte';

	export let staff: TournamentStaffRole[];
</script>

<div class="flex flex-col gap-3">
	<RosterGroups groups={staff.map((role) => ({ ...role, members: role.members }))} />
</div>
