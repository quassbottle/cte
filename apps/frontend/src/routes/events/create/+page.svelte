<script lang="ts">
	import { enhance } from '$app/forms';
	import type { OsuMode } from '$lib/api/types';
	import Group from '$lib/components/group/group.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';
	import { gamemodes } from '$lib/utils/types';
	let mode: OsuMode = 'osu';
</script>

<Group let:Title let:Content>
	<Title>Create a tournament</Title>
	<Content>
		<form method="post" action="?/create" use:enhance class="flex flex-col gap-4 p-1">
			<div class="flex w-full max-w-sm flex-col gap-1.5">
				<Label for="name">Name</Label>
				<Input name="name" placeholder="Tournament name" />
			</div>
			<div class="flex w-full max-w-sm flex-col gap-1.5">
				<Label for="mode">Mode</Label>
				<select
					id="mode"
					name="mode"
					class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
