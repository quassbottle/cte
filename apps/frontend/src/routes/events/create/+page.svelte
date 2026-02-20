<script lang="ts">
	import { api } from '$lib/api/api';
	import type { TournamentCreateDto } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/';
	import { gamemodes } from '$lib/utils/types';
	import { format } from 'date-fns';
	import type { PageData } from '../$types';

	export let data: PageData;

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
				endsAt: null,
				startsAt: format(new Date(), 'yyyy-MM-dd'),
				type: 'classic'
			});

		if (tournament.success) {
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
					<Select.Input name="mode" />
				</Select.Root>
			</div>

			<Button class="mt-2 w-[120px] bg-accept text-[12px]" variant="accept" type="submit"
				>Create</Button
			>
		</form>
	</Content>
</Group>
