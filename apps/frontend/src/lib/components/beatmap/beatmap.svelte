<script lang="ts">
	import Banner from '../banner/banner.svelte';
	import CopyButton from './copyButton.svelte';
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
		tournamentMode?: 'osu' | 'taiko' | 'fruits' | 'mania';
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
		tournamentMode = 'osu',
		index = null,
		difficulty = null,
		deleted = false,
		class: className
	}: BeatmapProps = $props();

	const getMpModsCommand = (value: string): string => {
		const normalizedMod = value.trim().toUpperCase();
		const baseMod = normalizedMod.match(/^[A-Z]+/)?.[0] ?? normalizedMod;

		if (baseMod === 'FM' || baseMod === 'TB') {
			return '!mp mods freemod';
		}

		if (baseMod === 'HD' || baseMod === 'HR' || baseMod === 'DT' || baseMod === 'EZ') {
			return `!mp mods NF ${baseMod}`;
		}

		return '!mp mods NF';
	};

	const getPlaymodeFromTournamentMode = (value: 'osu' | 'taiko' | 'fruits' | 'mania') => {
		if (value === 'taiko') return 1;
		if (value === 'fruits') return 2;
		if (value === 'mania') return 3;
		return 0;
	};

	const getPlaymodeFromSectionMod = (value: string): number | null => {
		const normalizedMod = value.trim().toUpperCase();
		const baseMod = normalizedMod.match(/^[A-Z]+/)?.[0] ?? normalizedMod;

		if (baseMod === 'STD') return 0;
		if (baseMod === 'TAIKO') return 1;
		if (baseMod === 'CTB') return 2;
		if (baseMod === 'MANIA') return 3;
		return null;
	};

	const getMpMapCommand = (
		beatmapIdValue: number,
		modValue: string,
		tournamentModeValue: 'osu' | 'taiko' | 'fruits' | 'mania'
	) => {
		const explicitPlaymode = getPlaymodeFromSectionMod(modValue);
		const playmode = explicitPlaymode ?? getPlaymodeFromTournamentMode(tournamentModeValue);
		return `!mp map ${beatmapIdValue} ${playmode}`;
	};
</script>

<div class="flex w-full flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[120px] w-full"
		src={`https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`}
	></Banner>

	<div class="relative flex flex-col gap-2 p-4 pr-72">
		<a class="text-[20px] font-semibold hover:underline" href={`https://osu.ppy.sh/b/${beatmapId}`}>
			{artist} - {title}
		</a>

		<BreadcrumbList let:Item>
			<Item>
				<div class="flex flex-row items-center gap-1 text-[12px]">
					{difficultyName}
				</div>
			</Item>
			{#if !deleted && difficulty !== null}
				<Item>
					<div class="flex flex-row items-center gap-1 text-[12px]">
						{difficulty} &#9733;
					</div>
				</Item>
			{/if}
		</BreadcrumbList>

		<Mod mod={mod} index={index} />

		<div class="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
			<a
				class="rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
				href={`osu://b/${beatmapId}`}
			>
				Direct
			</a>
			<CopyButton label="Copy ID" value={String(beatmapId)} />
			<CopyButton label="Copy MP MAP" value={getMpMapCommand(beatmapId, mod, tournamentMode)} />
			<CopyButton label="Copy MP MODS" value={getMpModsCommand(mod)} />
		</div>
	</div>
</div>
