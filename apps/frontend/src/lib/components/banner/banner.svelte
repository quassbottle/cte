<script lang="ts">
	import { cn } from '$lib/utils';
	import Description from './bannerDescription.svelte';
	import Title from './bannerTitle.svelte';
	import Content from './bannerContent.svelte';

	let bannerSrc: string | null = null;
	export { bannerSrc as src };

	let className: string | null = null;
	export { className as class };
</script>

<div
	class={cn(
		'relative flex h-[208px] flex-col justify-center gap-2 overflow-hidden rounded-2xl p-4',
		className
	)}
>
	{#if bannerSrc}
		<img
			class="absolute inset-0 z-0 h-full w-full border-none object-cover outline-none"
			alt="banner"
			src={bannerSrc}
			loading="lazy"
			decoding="async"
		/>
		<div
			class="z-1 absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black to-transparent"
		></div>
	{/if}

	<slot {Title} {Description} {Content}></slot>
</div>
