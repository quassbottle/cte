<script lang="ts">
	import type { QualificationLobbyDtoOutput } from '$lib/api/generated/model';
	import QualificationLobbyCard from './qualificationLobby.svelte';
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';

	export let lobby: QualificationLobbyDtoOutput;
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
	<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-popover p-6 shadow-2xl">
		<header class="mb-4 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Lobby {lobby.number}</h2>
			<Button type="button" variant="ghost" size="icon" on:click={onClose} aria-label="Close lobby">
				<X class="h-4 w-4" />
			</Button>
		</header>
		<QualificationLobbyCard {lobby} />
	</div>
</div>
