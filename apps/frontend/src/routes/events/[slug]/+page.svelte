<script lang="ts">
	import type {
		StageDto,
		TournamentDto,
		TournamentParticipantDto,
		UserDto,
		UserSession
	} from '$lib/api/types';
	import { gamemodes } from '$lib/utils/types';
	import { pluralize } from '$lib/utils/text';
	import GameModeIcon from '$lib/components/gamemode/gameModeIcon.svelte';
	import Banner from '$lib/components/banner/banner.svelte';
	import BreadcrumbList from '$lib/components/ui/breadcrumbList/breadcrumbList.svelte';
	import { Calendar, UserRound } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import Group from '$lib/components/group/group.svelte';
	import PlayerCard from '$lib/components/playerCard/playerCard.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import Markdown from '$lib/components/markdown/markdown.svelte';

	export let data: {
		tournament: TournamentDto;
		session?: UserSession;
		participants: TournamentParticipantDto[];
		host: UserDto;
		stages: StageDto[];
		canEditTournament: boolean;
	};

	$: registerButtonText = 'Register';
	$: registerAction = 'register';
	$: sortedStages = [...data.stages].sort(
		(left, right) => new Date(left.startsAt).valueOf() - new Date(right.startsAt).valueOf()
	);
</script>

<TabGroup let:Head let:ContentItem>
	<div class="mb-4 flex items-start justify-between">
		<Head let:Item class="gap-4 text-[24px] font-semibold">
			<Item>Info</Item>
			<Item>Participants</Item>
			<Item>Stages</Item>
		</Head>

		{#if data.canEditTournament}
			<a href="/events/{data.tournament.id}/edit">
				<Button class="w-[120px] text-[12px]">Edit</Button>
			</a>
		{/if}
	</div>

	<ContentItem class="flex flex-col gap-8">
		<div class="relative">
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
								<UserRound class="h-3 w-3" />
								{data.participants.length}
								{pluralize('participant', data.participants.length)}
							</div></Item
						>
						<Item>
							<div class="flex select-none flex-row items-center gap-1 text-[12px]">
								<GameModeIcon class="h-3 w-3 invert" gamemode={data.tournament.mode} />
								{gamemodes.find((item) => item.value === data.tournament.mode)?.label ??
									data.tournament.mode}
							</div>
						</Item>
						<Item>
							<p class="select-none gap-1 text-[12px]">
								{data.tournament.isTeam ? 'Team tournament' : 'Solo tournament'}
							</p>
						</Item>
						<Item>
							<p class="select-none gap-1 text-[12px]">
								Hosted by <a href="/users/{data.host.id}">{data.host.osuUsername}</a>
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
		</div>

		<Group let:Title let:Content>
			<Title>Description</Title>
			<Content class="text-justify">
				{#if data.tournament.description?.trim()}
					<Markdown value={data.tournament.description} />
				{:else}
					No description
				{/if}
			</Content>
		</Group>

		<Group let:Title let:Content>
			<Title>Rules</Title>
			<Content class="text-justify">
				{#if data.tournament.rules?.trim()}
					<Markdown value={data.tournament.rules} />
				{:else}
					No rules provided.
				{/if}
			</Content>
		</Group>
	</ContentItem>

	<ContentItem class="flex flex-grow flex-wrap gap-3">
		{#each data.participants as participant}
			<a href="/users/{participant.id}">
				<PlayerCard osuId={participant.osuId} username={participant.osuUsername} />
			</a>
		{:else}
			<p>Be the first one to register ;)</p>
		{/each}
	</ContentItem>

	<ContentItem class="flex flex-col gap-3">
		{#each sortedStages as stage}
			<div class="border-border rounded-md border px-3 py-2">
				<p class="text-sm font-medium">{stage.name}</p>
				<p class="text-xs text-muted-foreground">
					{new Date(stage.startsAt).toLocaleString()} - {new Date(stage.endsAt).toLocaleString()}
				</p>
			</div>
		{:else}
			<p>No stages added yet.</p>
		{/each}
	</ContentItem>
</TabGroup>

<div class="flex flex-col gap-16"></div>
