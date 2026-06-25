<script lang="ts">
	import SocialMediaButtons from '$lib/components/socialMediaButtons/socialMediaButtons.svelte';
	import { cn } from '$lib/utils';

	export let open = false;
</script>

<aside
	class="hidden w-[clamp(10rem,14vw,14rem)] shrink-0 flex-col justify-between border-r border-border py-8 pr-6 md:flex"
>
	<div class="sticky top-8">
		<slot></slot>
	</div>

	<SocialMediaButtons class="sticky bottom-8 mt-auto justify-center" />
</aside>

<aside
	class={cn(
		'fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col justify-between border-r border-border bg-sidebar px-6 py-8 text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out md:hidden',
		open ? 'translate-x-0' : '-translate-x-full'
	)}
	aria-hidden={!open}
>
	<div>
		<slot></slot>
	</div>

	<SocialMediaButtons class="justify-center" />
</aside>
