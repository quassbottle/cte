<script lang="ts">
	import type { UserDto } from '$lib/api/types';
	import AuthContainer from './authContainer.svelte';
	import Logo from '../logo/logo.svelte';

	export let user: UserDto | null;
</script>

<div class="flex w-full items-center justify-between bg-white px-24 py-4">
	<a href="/" class="icon flex cursor-pointer select-none flex-row items-center gap-2"
		><Logo />
		<p class="text-[20px] font-semibold">CTE</p></a
	>
	<AuthContainer {user} />
</div>
