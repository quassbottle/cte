<script lang="ts">
	import { Calendar } from 'lucide-svelte';
	import Banner from '../banner/banner.svelte';
	import BreadcrumbList from '../ui/breadcrumbList/breadcrumbList.svelte';
	import type { OsuMode } from '$lib/api/types';
	import { capitalizeFirstLetter, pluralize } from '$lib/utils/text';
	import GamemodeIcon from '../gamemode/gameModeIcon.svelte';

	export let name: string;
	export let startsAt: Date;
	export let mode: OsuMode;
	export let participants: number;
</script>

<div class="flex w-[368px] flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[200px] w-[368px] text-white"
		src={'https://assets.ppy.sh/beatmaps/2315685/covers/cover@2x.jpg'}
	></Banner>

	<div class="flex flex-col gap-2 p-4">
		<p class="text-[20px] font-semibold">{name}</p>

		<BreadcrumbList let:Item>
			<Item
				><div class="flex flex-row items-center gap-1 text-[12px]">
					<Calendar class="h-3 w-3 opacity-50" />
					{new Date(startsAt).toDateString()}
				</div></Item
			>
			<Item
				><div class="flex flex-row items-center gap-1 text-[12px]">
					<GamemodeIcon class="h-3 w-3 opacity-50" gamemode={mode} />
					{capitalizeFirstLetter(mode)}
				</div></Item
			>
		</BreadcrumbList>

		<p class="text-[14px] opacity-50">{participants} {pluralize('participant', participants)}</p>
	</div>
</div>
