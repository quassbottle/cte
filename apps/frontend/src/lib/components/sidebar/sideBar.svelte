<script lang="ts">
	import SocialMediaButtons from '$lib/components/socialMediaButtons/socialMediaButtons.svelte';
</script>

<aside
	class="flex w-[clamp(10rem,14vw,14rem)] shrink-0 flex-col justify-between border-r border-border py-8 pr-6"
>
	<div class="sticky top-8">
		<slot></slot>
	</div>

	<SocialMediaButtons class="sticky bottom-8 mt-auto justify-center" />
</aside>
