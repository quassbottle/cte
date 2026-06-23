<script lang="ts">
	import type { Viewer } from '$lib/types/viewer';
	import AuthContainer from './authContainer.svelte';
	import Logo from '../logo/logo.svelte';

	export let user: Viewer | null;
</script>

<div class="flex w-full items-center justify-between border-b border-border bg-background px-24 py-4">
	<a href="/" class="icon flex cursor-pointer select-none flex-row items-center gap-2"
		><Logo />
		<p class="text-[20px] font-semibold">CTE</p></a
	>
	<AuthContainer {user} />
</div>
