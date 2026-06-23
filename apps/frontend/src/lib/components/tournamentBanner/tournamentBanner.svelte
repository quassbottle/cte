<script lang="ts">
	import Banner from '../banner/banner.svelte';
	import { generatePattern, patternToDataURL } from '$lib/pattern';

	let bannerSeed: string;
	export { bannerSeed as seed };

	let className: string | null = null;
	export { className as class };

	$: pattern = generatePattern(bannerSeed, 1200, 260);
	$: src = patternToDataURL(pattern);
</script>

<Banner {src} class={className} let:Title let:Description let:Content>
	<slot {Title} {Description} {Content} />
</Banner>