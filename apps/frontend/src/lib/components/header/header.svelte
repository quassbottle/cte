<script lang="ts">
	import type { Viewer } from '$lib/types/viewer';
	import AuthContainer from './authContainer.svelte';
	import Logo from '../logo/logo.svelte';
	import { Menu } from 'lucide-svelte';
	import { Button } from '../ui/button';

	export let user: Viewer | null;
	export let isMenuOpen = false;
	export let onMenuClick: () => void = () => {};
</script>

<div
	class="sticky top-0 z-30 flex w-full min-w-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-3 sm:px-8 md:static md:px-16 md:py-4 lg:px-24"
>
	<div class="flex min-w-0 items-center gap-2 sm:gap-3">
		<Button
			class="shrink-0 md:hidden"
			variant="ghost"
			size="icon"
			aria-label="Open navigation"
			aria-expanded={isMenuOpen}
			on:click={onMenuClick}
		>
			<Menu class="h-5 w-5" />
		</Button>

		<a
			href="/"
			class="icon flex min-w-0 shrink-0 cursor-pointer select-none flex-row items-center gap-2"
		>
			<Logo />
			<p class="text-[20px] font-semibold">CTE</p>
		</a>
	</div>

	<AuthContainer {user} />
</div>
