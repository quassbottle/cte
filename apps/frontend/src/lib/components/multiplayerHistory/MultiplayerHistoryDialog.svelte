<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';

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
	<div
		class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-popover shadow-2xl"
	>
		<Button
			type="button"
			variant="ghost"
			size="icon"
			class="absolute right-4 top-4 z-10"
			on:click={onClose}
			aria-label="Close history"
		>
			<X class="h-4 w-4" />
		</Button>
		<slot />
	</div>
</div>
