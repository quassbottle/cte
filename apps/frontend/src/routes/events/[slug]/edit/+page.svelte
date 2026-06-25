<script lang="ts">
	import type { MappoolBeatmapDto, MappoolDto, StageDto, TournamentDto } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import MappoolsTab from './components/mappools/MappoolsTab.svelte';
	import type { TournamentEditActionResult } from '$lib/types/tournament-edit-action';
	import StagesTab from './components/StagesTab.svelte';
	import TournamentTab from './components/TournamentTab.svelte';

	export let data: {
		tournament: TournamentDto;
		stages: StageDto[];
		mappools: MappoolDto[];
		mappoolBeatmaps: { mappoolId: string; beatmaps: MappoolBeatmapDto[] }[];
	};
	export let form: TournamentEditActionResult | undefined;

	let activeTab = 'tournament';
</script>

<svelte:head>
	<title>CTE - Edit {data.tournament.name}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<TabGroup bind:value={activeTab} let:Head let:ContentItem>
		<div class="mb-4 flex items-start justify-between">
			<Head let:Item class="gap-4 text-[24px] font-semibold">
				<Item value="tournament">Tournament</Item>
				<Item value="stages">Stages</Item>
				<Item value="mappools">Mappools</Item>
			</Head>

			<a href="/events/{data.tournament.id}">
				<Button class="w-[120px] text-[12px]" variant="outline">View</Button>
			</a>
		</div>

		<ContentItem value="tournament">
			<TournamentTab tournament={data.tournament} {form} />
		</ContentItem>

		<ContentItem value="stages">
			<StagesTab tournament={data.tournament} stages={data.stages} {form} />
		</ContentItem>

		<ContentItem value="mappools">
			<MappoolsTab
				tournamentMode={data.tournament.mode}
				stages={data.stages}
				mappools={data.mappools}
				mappoolBeatmaps={data.mappoolBeatmaps}
				{form}
			/>
		</ContentItem>
	</TabGroup>
</div>
