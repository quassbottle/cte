<script lang="ts">
	import Banner from '../banner/banner.svelte';
	import Mod from '../mod/mod.svelte';
	import BreadcrumbList from '../ui/breadcrumbList/breadcrumbList.svelte';

	export let artist: string;
	export let title: string;
	export let difficultyName: string;
	export let difficulty: number;
	export let version: number;
	export let beatmapsetId: number;
	export let beatmapId: number;
</script>

<div class="flex w-full flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[120px] w-full"
		src={version ? `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg` : null}
	></Banner>

	<div class="flex flex-col gap-2 p-4">
		<a class="text-[20px] font-semibold hover:underline" href={`https://osu.ppy.sh/b/${beatmapId}`}>
			{artist} - {title}
		</a>

		<BreadcrumbList let:Item>
			<Item>
				<div class="flex flex-row items-center gap-1 text-[12px]">
					{difficultyName}
				</div>
			</Item>
			{#if difficulty > 0}
				<Item>
					<div class="flex flex-row items-center gap-1 text-[12px]">
						{difficulty} &#9733;
					</div>
				</Item>
			{/if}
		</BreadcrumbList>

		<Mod mod="NM" />
	</div>
</div>
