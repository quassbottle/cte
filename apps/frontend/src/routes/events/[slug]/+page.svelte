<script lang="ts">
	import type { TournamentDto, UserDto, UserSession } from '$lib/api/types';
	import { capitalizeFirstLetter, pluralize } from '$lib/utils/text';
	import Banner from '$lib/components/banner/banner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { Calendar, UserRound } from 'lucide-svelte';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';

	export let data: {
		tournament: TournamentDto;
		session?: UserSession;
		participants: UserDto[];
		host: UserDto;
	};

	$: registerButtonText = data.tournament.participating ? 'Unregister' : 'Register';
	$: registerAction = data.tournament.participating ? 'unregister' : 'register';
</script>

<TabGroup let:Head let:ContentItem>
	<Head let:Item class="mb-4 gap-4 text-[24px] font-semibold">
		<Item>Tournament Info</Item>
		<Item>Rules</Item>
		<Item>Participants</Item>
		<Item>Staff</Item>
	</Head>

	<ContentItem class="flex flex-col gap-8">
		<Banner
			class="relative h-[260px] text-white"
			let:Content
			src={'https://assets.ppy.sh/beatmaps/2315685/covers/cover@2x.jpg'}
		>
			<Content class="absolute bottom-0 left-0 flex w-[60%] flex-col p-6">
				<p class="text-[32px] font-semibold">{data.tournament.name}</p>
				<BreadcrumbList let:Item>
					<Item
						><div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<Calendar class="h-3 w-3" />
							{new Date(data.tournament.startsAt).toDateString()}
						</div></Item
					>
					<Item
						><div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<GameModeIcon class="h-3 w-3 invert" gamemode={data.tournament.mode} />
							{capitalizeFirstLetter(data.tournament.mode)}
						</div></Item
					>
					<Item>
						<div class="flex select-none flex-row items-center gap-1 text-[12px]">
							<UserRound class="h-3 w-3" />
							{data.tournament.participants}
							{pluralize('participant', data.tournament.participants)}
						</div>
					</Item>
					<Item>
						<p class="select-none gap-1 text-[12px]">
							Hosted by <a href="/users/{data.host.id}">{data.host.username}</a>
						</p>
					</Item>
				</BreadcrumbList>

				{#if data.session}
					<form method="post" action="?/{registerAction}">
						<Button
							disabled={true}
							class="mt-2 w-[120px] bg-accept text-[12px]"
							variant="accept"
							type="submit">{registerButtonText}</Button
						>
					</form>
				{/if}
			</Content>
		</Banner>

		<Group let:Title let:Content>
			<Title>Description</Title>
			<Content class="text-justify"
				>Tournament description Tournament description Tournament description Tournament description
				Tournament description Tournament description Tournament description Tournament description
				Tournament description Tournament description Tournament description Tournament description
				Tournament description Tournament description Tournament description Tournament description
				Tournament description Tournament description Tournament description Tournament description
				Tournament description
			</Content>
		</Group>
	</ContentItem>

	<ContentItem>Rules xd</ContentItem>

	<ContentItem class="flex flex-grow flex-wrap gap-3">
		{#each data.participants as participant}
			<a href="/user/{participant.id}">
				<PlayerCard osuId={participant.osuId} username={participant.username} />
			</a>
		{:else}
			<p>Be the first one to register ;)</p>
		{/each}
	</ContentItem>

	<ContentItem class="flex flex-grow flex-wrap gap-3">
		{#each data.participants as participant}
			<a href="/user/{participant.id}">
				<PlayerCard osuId={participant.osuId} username={participant.username} />
			</a>
		{:else}
			<p>Be the first one to register ;)</p>
		{/each}
	</ContentItem>
</TabGroup>

<div class="flex flex-col gap-16"></div>
