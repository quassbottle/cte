<script lang="ts">
	import type { OsuMode } from '$lib/api/types';
	import Banner from '../banner/banner.svelte';
	import { generatePattern, patternToDataURL } from '$lib/utils/pattern';

	let bannerSeed: string;
	export { bannerSeed as seed };
	export let mode: OsuMode | undefined = undefined;

	let className: string | null = null;
	export { className as class };

	$: pattern = generatePattern(bannerSeed, 1200, 260, mode);
	$: src = patternToDataURL(pattern);
</script>

<Banner {src} class={className} let:Title let:Description let:Content>
	<slot {Title} {Description} {Content} />
</Banner>
