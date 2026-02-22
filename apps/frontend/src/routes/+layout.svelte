<script lang="ts">
	import Header from '$lib/components/header/header.svelte';
	import MainContainer from '$lib/components/mainContainer/mainContainer.svelte';
	import SideBar from '$lib/components/sidebar/sideBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { Calendar, House } from 'lucide-svelte';
	import '../app.css';
	import type { PageData } from './$types';
	import WorkInProgress from '$lib/components/workInProgress/workInProgress.svelte';

	export let data: PageData;
	let isNavigating = false;

	beforeNavigate(({ to }) => {
		if (to) {
			isNavigating = true;
		}
	});

	afterNavigate(() => {
		isNavigating = false;
	});
</script>

{#if isNavigating}
	<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/50">
		<div class="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg">
			<div class="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
			<span>Loading...</span>
		</div>
	</div>
{/if}

<WorkInProgress />
<Header user={data.user} />
<div class="mx-16 flex flex-row">
	<SideBar>
		<div class="flex flex-col gap-4">
			<Button variant="ghost" href="/">
				<House class="mr-2 h-4 w-4" />
				Home
			</Button>
			<Button variant="ghost" href="/events">
				<Calendar class="mr-2 h-4 w-4" />
				Events
			</Button>
		</div>
	</SideBar>
	<div class="w-full">
		<MainContainer>
			<slot></slot>
		</MainContainer>
	</div>
</div>
