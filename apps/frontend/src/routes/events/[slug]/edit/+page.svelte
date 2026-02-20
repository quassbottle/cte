<script lang="ts">
	import type { OsuMode, TournamentDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/';

	const gamemodes: { value: OsuMode; label: string }[] = [
		{ value: 'osu', label: 'Standart' },
		{ value: 'taiko', label: 'Taiko' },
		{ value: 'fruits', label: 'Catch the beat' },
		{ value: 'mania', label: 'Mania' }
	];

	export let data: { tournament: TournamentDto };
</script>

<Group let:Title let:Content>
	<Title>Manage {data.tournament.name}</Title>
	<Content class="flex flex-col gap-4 p-1">
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for="name">Name</Label>
			<Input placeholder="Tournament name" />
		</div>

		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for="name">Mode</Label>
			<Select.Root portal={null}>
				<Select.Trigger class="w-[180px]">
					<Select.Value placeholder="Select the mode" />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Mode</Select.Label>
						{#each gamemodes as gamemode}
							<Select.Item value={gamemode.value} label={gamemode.label}
								>{gamemode.label}</Select.Item
							>
						{/each}
					</Select.Group>
				</Select.Content>
				<Select.Input name="favoriteFruit" />
			</Select.Root>
		</div>
	</Content>
</Group>
