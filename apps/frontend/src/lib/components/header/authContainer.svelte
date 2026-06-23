<script lang="ts">
	import type { Viewer } from '$lib/types/viewer';
	import { AvatarImage } from '$lib/components/ui/avatar';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import RoundButton from '../ui/roundbutton/RoundButton.svelte';
	import { Bell } from 'lucide-svelte';

	export let user: Viewer | null;
</script>

{#if user}
	<div class="flex flex-row items-center gap-2">
		<RoundButton>
			<Bell size="16" />
		</RoundButton>
		<a href="/users/{user.id}">
			<Avatar class="cursor-pointer">
				<AvatarImage src={getAvatarUrlByOsuId(user.osuId)} />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
		</a>
	</div>
{:else}
	<Button href="/auth/login">Login</Button>
{/if}
