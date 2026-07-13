<script lang="ts">
	import type { SelectedUser } from '$lib/schemas/user.schema';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { lookupSelectedUser } from '$lib/utils/user-lookup';
	import { Plus, X } from 'lucide-svelte';

	export let label: string;
	export let name: string;
	export let selectedUsers: SelectedUser[] = [];
	export let multiple = false;

	let query = '';
	let error = '';
	let isPending = false;

	const addUser = (user: SelectedUser) => {
		if (selectedUsers.some((candidate) => candidate.id === user.id)) {
			error = 'User already added.';
			return;
		}

		selectedUsers = multiple ? [...selectedUsers, user] : [user];
		query = '';
		error = '';
	};

	const removeUser = (userId: string) => {
		selectedUsers = selectedUsers.filter((user) => user.id !== userId);
	};

	const handleAddUser = async () => {
		const value = query.trim();
		if (!value) {
			error = 'Enter osu id, osu username, or local id.';
			return;
		}

		isPending = true;
		error = '';

		try {
			addUser(await lookupSelectedUser(value));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'User lookup failed.';
		} finally {
			isPending = false;
		}
	};
</script>

<div class="flex flex-col gap-2">
	<input type="hidden" {name} value={selectedUsers.map((user) => user.id).join(',')} />
	<label for={`schedule-user-${name}`} class="text-[12px] font-medium">{label}</label>

	<div class="flex flex-col gap-2 sm:flex-row">
		<input
			id={`schedule-user-${name}`}
			class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			placeholder="osu id / username"
			bind:value={query}
			on:keydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					void handleAddUser();
				}
			}}
		/>
		<Button
			type="button"
			variant="outline"
			class="gap-1"
			on:click={() => void handleAddUser()}
			disabled={isPending}
		>
			<Plus class="h-4 w-4" />
			Add
		</Button>
	</div>

	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}

	{#if selectedUsers.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each selectedUsers as user}
				<div class="flex items-center gap-2 rounded-md border border-border px-2 py-1">
					<Avatar class="h-6 w-6 rounded-md">
						<AvatarImage src={user.avatarUrl} alt={user.osuUsername} />
						<AvatarFallback>{user.osuUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
					<span class="max-w-[160px] truncate text-xs">{user.osuUsername}</span>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						class="h-6 w-6"
						on:click={() => removeUser(user.id)}
					>
						<X class="h-3 w-3" />
					</Button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-muted-foreground">No user selected.</p>
	{/if}
</div>
