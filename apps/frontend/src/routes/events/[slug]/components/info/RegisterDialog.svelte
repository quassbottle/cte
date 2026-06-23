<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
	import type { TournamentRegistrationForm } from './types';

	export let label: string;
	export let form: TournamentRegistrationForm;
	export let onClose: () => void;
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	on:click={(event) => {
		if (event.target === event.currentTarget) onClose();
	}}
	on:keydown={(event) => {
		if (event.key === 'Escape') onClose();
	}}
>
	<div class="w-full max-w-md rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div>
				<p class="text-xl font-semibold">Register</p>
				<p class="text-sm text-muted-foreground">Are you sure you want to register?</p>
			</div>
			<Button variant="ghost" size="icon" on:click={onClose}>
				<X class="h-4 w-4" />
			</Button>
		</div>

		{#if form?.registrationError}
			<p class="mb-4 text-sm text-destructive">{form.registrationError}</p>
		{/if}

		<div class="flex items-center gap-2">
			<Button type="button" variant="outline" class="text-[12px]" on:click={onClose}>Cancel</Button>
			<form method="post" action="?/register" use:enhance>
				<input type="hidden" name="isTeamTournament" value="false" />
				<Button class="bg-accept text-[12px]" variant="accept" type="submit">
					{label}
				</Button>
			</form>
		</div>
	</div>
</div>