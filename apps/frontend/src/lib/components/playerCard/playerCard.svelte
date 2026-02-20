<script lang="ts">
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

	export let username: string;
	export let osuId: number;
</script>

<div class="flex flex-col items-center gap-2 rounded-lg p-6 shadow-lg">
	<Avatar class="align-center h-[96px] w-[96px] rounded-[24px]">
		<AvatarImage src={getAvatarUrlByOsuId(osuId)} />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>

	<p>{username}</p>
</div>
