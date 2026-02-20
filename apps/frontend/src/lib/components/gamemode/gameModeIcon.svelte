<script lang="ts">
	import type { OsuMode } from '$lib/api/types';
	import StdIcon from './stdIcon.svelte';
	import TaikoIcon from './taikoIcon.svelte';

	export let gamemode: OsuMode = 'osu';
	let className: string = '';
	export { className as class };
</script>

{#if gamemode === 'taiko'}
	<TaikoIcon class={className}></TaikoIcon>
{:else}
	<StdIcon class={className}></StdIcon>
{/if}
