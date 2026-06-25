<script lang="ts">
	import type { MatchStaffView } from './types';
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
	import StaffRoleIcon from './StaffRoleIcon.svelte';

	export let staff: MatchStaffView[];
	export let compact = false;
</script>

{#if compact}
	<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
		{#each staff as staffMember}
			<span class="flex items-center gap-1 rounded border border-border px-2 py-1">
				<Avatar class="h-5 w-5 rounded-md">
					<AvatarImage src={getAvatarUrlByOsuId(staffMember.osuId)} />
					<AvatarFallback>{staffMember.initials}</AvatarFallback>
				</Avatar>
				{staffMember.name}
				<StaffRoleIcon role={staffMember.role} size={3} />
			</span>
		{/each}
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each staff as staffMember}
			<div class="flex items-center gap-2">
				<Avatar class="h-6 w-6 rounded-md">
					<AvatarImage src={getAvatarUrlByOsuId(staffMember.osuId)} />
					<AvatarFallback>{staffMember.initials}</AvatarFallback>
				</Avatar>
				<span class="text-xs">{staffMember.name}</span>
				<StaffRoleIcon role={staffMember.role} />
			</div>
		{/each}
	</div>
{/if}
