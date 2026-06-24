<script lang="ts">
	import type { OsuMode } from '$lib/api/types';
	import FruitsIcon from './fruitsIcon.svelte';
	import ManiaIcon from './maniaIcon.svelte';
	import StdIcon from './stdIcon.svelte';
	import TaikoIcon from './taikoIcon.svelte';

	export let gamemode: OsuMode = 'osu';
	let className: string = '';
	export { className as class };
</script>

{#if gamemode === 'taiko'}
	<TaikoIcon class={className}></TaikoIcon>
{:else if gamemode === 'fruits'}
	<FruitsIcon class={className}></FruitsIcon>
{:else if gamemode === 'mania'}
	<ManiaIcon class={className}></ManiaIcon>
{:else}
	<StdIcon class={className}></StdIcon>
{/if}
