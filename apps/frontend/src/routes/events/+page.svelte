<script lang="ts">
	import type { TournamentDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import TournamentCard from '$lib/components/tournamentCard/tournamentCard.svelte';
	import {
		getEventsModeHref,
		getEventsStatusHref,
		type TournamentModeFilter,
		type TournamentStatusFilter
	} from '$lib/utils/events-filter';
	import { gamemodes } from '$lib/utils/types';

	const modeTabs = [{ value: 'all' as const, label: 'All' }, ...gamemodes];
	const statusTabs: { value: TournamentStatusFilter; label: string }[] = [
		{ value: 'active', label: 'Active Tournaments' },
		{ value: 'archived', label: 'Archived Tournaments' }
	];

	export let data: {
		tournaments: TournamentDto[];
		selectedMode: TournamentModeFilter;
		selectedStatus: TournamentStatusFilter;
	};
</script>

<svelte:head>
	<title>CTE - Events</title>
</svelte:head>

<Group let:Content>
	<TabGroup value={data.selectedStatus} let:Head>
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			{#each statusTabs as status}
				<Item value={status.value} href={getEventsStatusHref(status.value, data.selectedMode)}>
					{status.label}
				</Item>
			{/each}
		</Head>
	</TabGroup>
	<Content class="flex flex-col gap-7">
		<TabGroup value={data.selectedMode} let:Head>
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				{#each modeTabs as mode}
					<Item value={mode.value} href={getEventsModeHref(mode.value, data.selectedStatus)}>
						{mode.label}
					</Item>
				{/each}
			</Head>
		</TabGroup>
		{#if data.tournaments.length > 0}
			<div
				class="grid grid-cols-1 gap-7 lg:grid-cols-2 xl:grid-cols-3"
				style="grid-template-columns: repeat(auto-fill, minmax(min(100%, 370px), 1fr))"
			>
				{#each data.tournaments as tournament (tournament.id)}
					<a class="cursor-pointer" href="/events/{tournament.id}">
						<TournamentCard {...tournament} />
					</a>
				{/each}
			</div>
		{:else}
			<div class="flex min-h-[40vh] items-center justify-center text-center text-muted-foreground">
				No tournaments found.
			</div>
		{/if}
	</Content>
</Group>
