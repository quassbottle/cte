<script lang="ts">
	import { env } from '$env/dynamic/public';
	import type { UserDto } from '$lib/api/types';
	import { AvatarImage } from '$lib/components/ui/avatar';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import RoundButton from '../ui/roundbutton/RoundButton.svelte';
	import { Bell } from 'lucide-svelte';

	export let user: UserDto | null;

	const getRedirectUri = () => env.PUBLIC_REDIRECT_URI ?? `${window.location.origin}/auth`;
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
	<Button
		on:click={() => {
			const redirectUri = encodeURIComponent(getRedirectUri());
			window.location.replace(
				`https://osu.ppy.sh/oauth/authorize?client_id=34164&redirect_uri=${redirectUri}&response_type=code&scope=public+identify`
			);
		}}>Login</Button
	>
{/if}
