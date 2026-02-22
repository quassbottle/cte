<script lang="ts">
	import { Calendar } from 'lucide-svelte';
	import Banner from '../banner/banner.svelte';
	import BreadcrumbList from '../ui/breadcrumbList/breadcrumbList.svelte';
	import { pluralize } from '$lib/utils/text';

	export let name: string;
	export let startsAt: Date;
	export let isTeam: boolean;
	export let participantsCount = 0;
</script>

<div class="flex w-full flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[200px] text-white"
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
					{isTeam ? 'Team tournament' : 'Solo tournament'}
				</div></Item
			>
		</BreadcrumbList>

		<p class="text-[14px] opacity-50">
			{participantsCount} {pluralize('participant', participantsCount)}
		</p>
	</div>
</div>
