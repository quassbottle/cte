<script lang="ts">
	import Banner from '../banner/banner.svelte';
	import Mod from '../mod/mod.svelte';
	import BreadcrumbList from '../ui/breadcrumbList/breadcrumbList.svelte';

	type BeatmapProps = {
		class?: string;
		artist: string;
		title: string;
		difficultyName: string;
		beatmapsetId: number;
		beatmapId: number;
		mod?: string;
		index?: number | null;
		difficulty?: number | null;
		deleted?: boolean;
	};

	const {
		artist,
		title,
		difficultyName,
		beatmapsetId,
		beatmapId,
		mod = 'NM',
		index = null,
		difficulty = null,
		deleted = false,
		class: className
	}: BeatmapProps = $props();
</script>

<div class="flex w-full flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[120px] w-full"
		src={`https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`}
	></Banner>

	<div class="relative flex flex-col gap-2 p-4 pr-24">
		<a class="text-[20px] font-semibold hover:underline" href={`https://osu.ppy.sh/b/${beatmapId}`}>
			{artist} - {title}
		</a>

		<BreadcrumbList let:Item>
			<Item>
				<div class="flex flex-row items-center gap-1 text-[12px]">
					{difficultyName}
				</div>
			</Item>
			{#if !deleted && difficulty !== null && difficulty > 0}
				<Item>
					<div class="flex flex-row items-center gap-1 text-[12px]">
						{difficulty} &#9733;
					</div>
				</Item>
			{/if}
		</BreadcrumbList>

		<Mod mod={mod} index={index} />

		<a
			class="absolute bottom-4 right-4 rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
			href={`osu://b/${beatmapId}`}
		>
			Direct
		</a>
	</div>
</div>
