<script context="module" lang="ts">
	export type SearchOption = {
		id: string;
		label: string;
		avatarUrl?: string;
	};
</script>

<script lang="ts">
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { debounce } from '$lib/utils/debounce';
	import { Combobox, type Selected } from 'bits-ui';
	import { Search, Users } from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	export let label: string;
	export let name: string;
	export let placeholder: string;
	export let search: (query: string, signal: AbortSignal) => Promise<SearchOption[]>;
	export let initial: SearchOption | undefined = undefined;
	export let selectedId: string | undefined = initial?.id;

	let options = initial ? [initial] : [];
	let selected: Selected<string> | undefined = initial
		? { value: initial.id, label: initial.label }
		: undefined;
	let inputValue = initial?.label ?? '';
	let open = false;
	let loading = false;
	let error = '';
	let controller: AbortController | undefined;
	let lastSearchedInput = inputValue;
	$: if (selected && inputValue !== selected.label) selected = undefined;
	$: selectedId = selected?.value;
	$: selectedOption =
		options.find((option) => option.id === selected?.value) ??
		(initial?.id === selected?.value ? initial : undefined);

	const load = async (query: string) => {
		controller?.abort();
		const currentController = new AbortController();
		controller = currentController;
		loading = true;
		error = '';

		try {
			options = await search(query, currentController.signal);
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
			error = 'Could not load options.';
		} finally {
			if (controller === currentController) loading = false;
		}
	};

	const debouncedSearch = debounce((query: string) => void load(query), 250);

	const handleOpen = (value: boolean) => {
		open = value;
		if (value) {
			debouncedSearch.cancel();
			lastSearchedInput = inputValue;
			void load(inputValue === selected?.label ? '' : inputValue);
		} else {
			debouncedSearch.cancel();
			controller?.abort();
		}
	};

	$: if (open && inputValue !== lastSearchedInput) {
		lastSearchedInput = inputValue;
		loading = true;
		debouncedSearch(inputValue);
	}

	onDestroy(() => {
		debouncedSearch.cancel();
		controller?.abort();
	});
</script>

<div class="flex flex-col gap-2">
	<label for={`search-${name}`} class="text-[12px] font-medium">{label}</label>
	<input type="hidden" {name} value={selectedId ?? ''} />

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
				id={`search-${name}`}
				class="h-9 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				{placeholder}
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
				<p class="px-2 py-3 text-center text-xs text-muted-foreground">No results found.</p>
			{:else}
				{#each options as option (option.id)}
					<Combobox.Item
						value={option.id}
						label={option.label}
						class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[selected]:bg-accent"
					>
						{#if option.avatarUrl}
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

	{#if selectedOption}
		<div class="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
			{#if selectedOption.avatarUrl}
				<Avatar class="h-7 w-7">
					<AvatarImage src={selectedOption.avatarUrl} alt={selectedOption.label} />
					<AvatarFallback>{selectedOption.label.slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
			{/if}
			<span class="truncate text-sm font-medium">{selectedOption.label}</span>
		</div>
	{/if}
</div>
