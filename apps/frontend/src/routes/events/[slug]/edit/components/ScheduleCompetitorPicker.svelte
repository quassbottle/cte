<script lang="ts">
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import type { CompetitorOption } from '$lib/utils/competitor-search';
	import { debounce } from '$lib/utils/debounce';
	import { Combobox, type Selected } from 'bits-ui';
	import { Search, Users } from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	export let label: string;
	export let name: string;
	export let tournamentId: string;
	export let type: 'player' | 'team';
	export let initial: CompetitorOption | undefined = undefined;

	let options: CompetitorOption[] = initial ? [initial] : [];
	let selected: Selected<string> | undefined = initial
		? { value: initial.id, label: initial.label }
		: undefined;
	let inputValue = initial?.label ?? '';
	let open = false;
	let loading = false;
	let error = '';
	let controller: AbortController | undefined;
	let lastSearchedInput = inputValue;

	const load = async (query: string) => {
		controller?.abort();
		const currentController = new AbortController();
		controller = currentController;
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams({ type, query });
			const response = await fetch(`/api/tournaments/${tournamentId}/competitors?${params}`, {
				signal: currentController.signal
			});
			if (!response.ok) throw new Error(await response.text());
			options = await response.json();
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
			error = 'Could not load tournament competitors.';
		} finally {
			if (controller === currentController) loading = false;
		}
	};

	const search = debounce((query: string) => void load(query), 250);

	const handleOpen = (value: boolean) => {
		open = value;
		if (value) {
			search.cancel();
			lastSearchedInput = inputValue;
			void load(inputValue === selected?.label ? '' : inputValue);
		} else {
			search.cancel();
			controller?.abort();
		}
	};

	$: if (open && inputValue !== lastSearchedInput) {
		lastSearchedInput = inputValue;
		search(inputValue);
	}

	onDestroy(() => {
		search.cancel();
		controller?.abort();
	});
</script>

<div class="flex flex-col gap-2">
	<label for={`schedule-competitor-${name}`} class="text-[12px] font-medium">{label}</label>
	<input type="hidden" {name} value={selected?.value ?? ''} />

	<Combobox.Root
		items={options.map((option) => ({ value: option.id, label: option.label }))}
		bind:selected
		bind:inputValue
		{open}
		onOpenChange={handleOpen}
	>
		<div class="relative">
			<Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
			<Combobox.Input
				id={`schedule-competitor-${name}`}
				class="h-9 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				placeholder={type === 'player' ? 'Search tournament player' : 'Search tournament team'}
			/>
		</div>

		<Combobox.Content
			class="z-50 max-h-64 w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
		>
			{#if loading}
				<p class="px-2 py-3 text-center text-xs text-muted-foreground">Searching…</p>
			{:else if error}
				<p class="px-2 py-3 text-center text-xs text-destructive">{error}</p>
			{:else if options.length === 0}
				<p class="px-2 py-3 text-center text-xs text-muted-foreground">No competitors found.</p>
			{:else}
				{#each options as option (option.id)}
					<Combobox.Item
						value={option.id}
						label={option.label}
						class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[selected]:bg-accent"
					>
						{#if option.type === 'player'}
							<Avatar class="h-7 w-7">
								<AvatarImage src={option.avatarUrl} alt={option.label} />
								<AvatarFallback>{option.label.slice(0, 2).toUpperCase()}</AvatarFallback>
							</Avatar>
						{:else}
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
								<Users class="h-4 w-4" />
							</span>
						{/if}
						<span class="truncate">{option.label}</span>
					</Combobox.Item>
				{/each}
			{/if}
		</Combobox.Content>
	</Combobox.Root>
</div>
