<script lang="ts">
	import { api } from '$lib/api/api';
	import type { OsuMode, TournamentCreateDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import { gamemodes } from '$lib/utils/types';
	import type { PageData } from '../$types';

	export let data: PageData;
	let mode: OsuMode = 'osu';

	async function onTournamentCreate(
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const body = Object.fromEntries(form.entries()) as unknown as TournamentCreateDto;

		const tournament = await api({ token: data.session!.token })
			.tournaments()
			.create({
				...body,
				description: null,
				rules: null,
				mode,
				isTeam: false,
				startsAt: new Date().toISOString(),
				endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			});

		if (tournament.success && tournament.result) {
			window.location.replace(`/events/${tournament.result.id}`);
		}
	}
</script>

<Group let:Title let:Content>
	<Title>Create a tournament</Title>
	<Content>
		<form method="post" class="flex flex-col gap-4 p-1" on:submit={onTournamentCreate}>
			<div class="flex w-full max-w-sm flex-col gap-1.5">
				<Label for="name">Name</Label>
				<Input name="name" placeholder="Tournament name" />
			</div>
			<div class="flex w-full max-w-sm flex-col gap-1.5">
				<Label for="mode">Mode</Label>
				<select
					id="mode"
					class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
					bind:value={mode}
				>
					{#each gamemodes as gamemode}
						<option value={gamemode.value}>{gamemode.label}</option>
					{/each}
				</select>
			</div>
			<Button class="mt-2 w-[120px] bg-accept text-[12px]" variant="accept" type="submit"
				>Create</Button
			>
		</form>
	</Content>
</Group>
