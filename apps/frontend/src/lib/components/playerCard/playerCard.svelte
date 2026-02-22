<script lang="ts">
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
	import { Crown } from 'lucide-svelte';

	export let username: string;
	export let osuId: number;
	export let isCaptain = false;
</script>

<div class="flex flex-col items-center gap-2 rounded-lg p-6 bg-[#f5f5f5]">
	<Avatar class="align-center h-[96px] w-[96px] rounded-[24px]">
		<AvatarImage src={getAvatarUrlByOsuId(osuId)} />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>

	<p class="flex items-center gap-1">
		<span>{username}</span>
		{#if isCaptain}
			<Crown size={14} class="text-amber-500" />
		{/if}
	</p>
</div>
