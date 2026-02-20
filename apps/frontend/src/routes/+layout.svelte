<script lang="ts">
	import Header from '$lib/components/header/header.svelte';
	import MainContainer from '$lib/components/mainContainer/mainContainer.svelte';
	import SideBar from '$lib/components/sidebar/sideBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Calendar, House, UserRound } from 'lucide-svelte';
	import '../app.css';
	import type { PageData } from './$types';
	import WorkInProgress from '$lib/components/workInProgress/workInProgress.svelte';

	export let data: PageData;
</script>

<WorkInProgress />
<Header user={data.user} />
<div class="mx-16 flex flex-row gap-4">
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
