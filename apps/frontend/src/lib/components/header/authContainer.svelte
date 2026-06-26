<script lang="ts">
	import type { Viewer } from '$lib/types/viewer';
	import { AvatarImage } from '$lib/components/ui/avatar';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import RoundButton from '../ui/roundbutton/RoundButton.svelte';
	import { toggleTheme, resolvedTheme } from '$lib/stores/theme';
	import { Bell, Moon, Sun } from 'lucide-svelte';

	export let user: Viewer | null;
</script>

<div class="flex flex-row items-center gap-2">
	<RoundButton on:click={toggleTheme} aria-label="Toggle theme">
		{#if $resolvedTheme === 'dark'}
			<Sun size="16" />
		{:else}
			<Moon size="16" />
		{/if}
	</RoundButton>

	{#if user}
		<RoundButton>
			<Bell size="16" />
		</RoundButton>
		<a href="/users/{user.id}">
			<Avatar class="cursor-pointer">
				<AvatarImage src={user.avatarUrl} />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
		</a>
	{:else}
		<Button href="/auth/login">Login</Button>
	{/if}
</div>
