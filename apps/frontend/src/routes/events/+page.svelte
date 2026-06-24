<script lang="ts">
	import type { TournamentDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import TournamentCard from '$lib/components/tournamentCard/tournamentCard.svelte';
	import { gamemodes } from '$lib/utils/types';

	type TournamentModeFilter = TournamentDto['mode'] | 'all';

	const modeTabs = [{ value: 'all' as const, label: 'All' }, ...gamemodes];

	export let data: { tournaments: TournamentDto[]; selectedMode: TournamentModeFilter };

	function getModeHref(mode: TournamentModeFilter) {
		const params = new URLSearchParams();
		params.set('mode', mode);

		return `/events?${params.toString()}`;
	}
</script>

<Group let:Title let:Content>
	<Title>Active Tournaments</Title>
	<Content class="flex flex-col gap-7">
		<TabGroup value={data.selectedMode} let:Head>
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				{#each modeTabs as mode}
					<Item value={mode.value} href={getModeHref(mode.value)}>
						{mode.label}
					</Item>
				{/each}
			</Head>
		</TabGroup>
		<div
			class="grid grid-cols-1 gap-7 lg:grid-cols-2 xl:grid-cols-3"
			style="grid-template-columns: repeat(auto-fill, minmax(370px, 1fr))"
		>
			{#each data.tournaments as tournament (tournament.id)}
				<a class="cursor-pointer" href="/events/{tournament.id}">
					<TournamentCard {...tournament} />
				</a>
			{/each}
		</div>
	</Content>
</Group>
